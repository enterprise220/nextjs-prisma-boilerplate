import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from 'next-validations';
import prisma from 'lib-server/prisma';
import nc, { ncOptions } from 'lib-server/nc';
import { requireAuth } from 'lib-server/middleware/auth';
import { getSession } from 'next-auth/react';
import { postCreateSchema, postsGetSchema } from 'lib-server/validation';
import { PostWithAuthor, PaginatedResponse } from 'types';

const handler = nc(ncOptions);

const validatePostCreate = withValidation({
  schema: postCreateSchema,
  type: 'Zod',
  mode: 'body',
});

const validatePostsGet = withValidation({
  schema: postsGetSchema,
  type: 'Zod',
  mode: 'query',
});

type QueryParamsType = {
  [key: string]: string | string[];
};

export type GetPostsQueryParams = {
  page?: number;
  limit?: number;
  searchTerm?: string;
  // maybe sort key and direction
};

// defined in a single place, only here
const DEFAULT_LIMIT = 3;

// fn reused in getServerSideProps
export const getPostsWithAuthor = async (
  query: QueryParamsType
): Promise<PaginatedResponse<PostWithAuthor>> => {
  const validationResult = postsGetSchema.safeParse(query);
  if (!validationResult.success) return; // throw 404 in getServerSideProps

  const { page = 1, limit = DEFAULT_LIMIT, searchTerm } = validationResult.data;

  const where = {
    where: {
      published: true,
      ...(searchTerm && {
        OR: [
          { title: { search: searchTerm } },
          {
            author: {
              name: { search: searchTerm },
            },
          },
        ],
      }),
    },
  };

  const totalCount = await prisma.post.count({ ...where });

  let posts = await prisma.post.findMany({
    ...where,
    skip: (page - 1) * limit,
    take: limit,
    include: {
      author: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  posts = Array.isArray(posts) ? posts : [];

  const result = {
    items: posts,
    pagination: {
      total: totalCount,
      pagesCount: Math.ceil(totalCount / limit),
      currentPage: page,
      perPage: limit,
      from: (page - 1) * limit + 1, // from item
      to: (page - 1) * limit + posts.length,
      hasMore: page < Math.ceil(totalCount / limit),
    },
  };

  // Math.ceil(1.4) = 2
  // 23 1..10, 11..20, 21..23

  return result;
};

// add pagination
handler.get(validatePostsGet(), async (req: NextApiRequest, res: NextApiResponse) => {
  const response = await getPostsWithAuthor(req.query);
  res.status(200).json(response);
});

handler.post(
  requireAuth,
  validatePostCreate(),
  async (req: NextApiRequest, res: NextApiResponse) => {
    const { title, content } = req.body;
    const session = await getSession({ req });

    const post = await prisma.post.create({
      data: {
        title,
        content,
        author: { connect: { email: session.user.email as string } },
      },
    });

    res.status(201).json({ post });
  }
);

export default handler;
