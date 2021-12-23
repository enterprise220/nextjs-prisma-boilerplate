import React from 'react';
import { GetServerSideProps } from 'next';
import PageLayout from 'layouts/PageLayout';
import { useSession, getSession } from 'next-auth/react';
import prisma from 'lib-server/prisma';
import { datesToStrings } from 'utils';
import { default as DraftsView } from 'views/Drafts';
import { PostsProps } from 'components/PostItem';

const Drafts: React.FC<PostsProps> = ({ posts }) => {
  const { data: session } = useSession();

  if (!session) {
    return (
      <PageLayout>
        <h1>My Drafts</h1>
        <div>You need to be authenticated to view this page.</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <DraftsView posts={posts} />
    </PageLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getSession({ req });

  if (!session) {
    res.statusCode = 403;
    return { props: { posts: [] } };
  }

  let _posts = await prisma.post.findMany({
    where: {
      author: { id: session.user.id },
      published: false,
    },
    include: {
      author: true,
    },
  });

  _posts = _posts?.length > 0 ? _posts : [];

  const posts = _posts.map(({ author, ...post }) =>
    datesToStrings({ ...post, author: datesToStrings(author) })
  );

  return {
    props: { posts },
  };
};

export default Drafts;
