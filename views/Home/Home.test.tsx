import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { customRender } from 'test/test-utils';
import HomeView from 'views/Home';
import { fakePosts } from 'test/server/fake-data';
import { errorHandler500 } from 'test/server';

describe('Home View', () => {
  test('renders title, pagination section and posts list', async () => {
    customRender(<HomeView />);

    // assert title
    const title = await screen.findByRole('heading', {
      name: /home/i,
    });
    expect(title).toBeInTheDocument();

    // assert pagination button 1
    const paginationButton = screen.getByRole('button', {
      name: /1/i,
    });
    expect(paginationButton).toBeInTheDocument();

    // assert search input
    const searchInput = screen.getByRole('textbox', {
      name: /search/i,
    });
    expect(searchInput).toBeInTheDocument();

    // assert first post's username link
    const usernameLink = screen.getAllByRole('link', {
      name: RegExp(`@${fakePosts.items[0].author.username}`, 'i'),
    })[0];
    expect(usernameLink).toBeInTheDocument();
  });

  test('finds post with submited search term', async () => {
    customRender(<HomeView />);

    // find input, type in it and submit
    const searchTerm = fakePosts.items[0].title;
    const searchInput = await screen.findByRole('textbox', {
      name: /search/i,
    });

    // fix this?
    await act(async () => {
      await userEvent.type(searchInput, searchTerm);
      fireEvent.submit(searchInput);
    });

    // wait for fetching indicator to appear and disappear, no need

    // assert searchTerm in second post's title
    const title = await screen.findByRole('heading', {
      name: RegExp(`${searchTerm}`, 'i'),
    });
    expect(title).toBeInTheDocument();

    // enough, don't recreate entire backend, use e2e tests
    // assert non existing term
  });

  test('1 renders ErrorBoundary on 500', async () => {
    // silence error output in tests
    const mockedConsoleError = jest.spyOn(console, 'error').mockImplementation();

    // return 500 from msw
    errorHandler500();
    customRender(<HomeView />);

    // assert ErrorBoundary and message
    const errorBoundaryMessage = await screen.findByTestId(/error\-boundary\-test/i);
    expect(errorBoundaryMessage).toHaveTextContent('Request failed with status code 500');

    mockedConsoleError.mockRestore();
  });
});
