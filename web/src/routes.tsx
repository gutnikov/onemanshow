import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth';

const queryClient = new QueryClient();

function useGreeting() {
  return useQuery({
    queryKey: ['greeting'],
    queryFn: async () => {
      const response = await api.api.greeting.$get();
      if (!response.ok) throw new Error('greeting unavailable');
      return response.json();
    },
  });
}

/** The single observation that proves build, static serving, API and database. */
function Greeting() {
  const { data, isPending, isError } = useGreeting();
  if (isPending) return <p data-testid="greeting-state">loading</p>;
  if (isError) return <p data-testid="greeting-state">unavailable</p>;
  if ('error' in data) return <p data-testid="greeting-state">unavailable</p>;
  return <p data-testid="greeting">{data.message}</p>;
}

function useMe() {
  return useQuery({
    queryKey: ['me'],
    retry: false,
    queryFn: async () => {
      const response = await api.api.me.$get();
      if (response.status === 401) return null;
      if (!response.ok) throw new Error('identity unavailable');
      return response.json();
    },
  });
}

/**
 * What the organisation can see, which is only its own. The list and the form
 * exist so that scoping is exercised rather than described: a requirement
 * saying rows record their organisation needs a row to point at.
 */
function Notes() {
  const [body, setBody] = useState('');
  // An empty list while loading and an empty list on failure look the same on
  // purpose here: the suite asserts on what is present, and a spinner in a
  // fixture is one more thing for a test to race.
  const { data, refetch } = useQuery({
    queryKey: ['notes'],
    retry: false,
    queryFn: async () => {
      const response = await api.api.notes.$get();
      if (!response.ok) throw new Error('notes unavailable');
      return response.json();
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <ul data-testid="notes">
        {(data?.notes ?? []).map((n) => (
          <li key={n.id} data-testid="note">
            {n.body}
          </li>
        ))}
      </ul>
      <input
        className="rounded border px-2 py-1"
        data-testid="note-body"
        placeholder="a note"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Button
        size="sm"
        data-testid="add-note"
        onClick={async () => {
          await api.api.notes.$post({ json: { body } });
          setBody('');
          await refetch();
        }}
      >
        add
      </Button>
    </div>
  );
}

/**
 * The second observation. Where the greeting proves build, serving, API and
 * database, this proves a session is created, carried and read - which is the
 * whole of what makes a pre-wired capability a feature rather than a claim.
 */
function Account() {
  const { data, isPending, isError, refetch } = useMe();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState('');

  if (isPending) return <p data-testid="account-state">loading</p>;
  if (isError) return <p data-testid="account-state">unavailable</p>;

  if (data !== null && 'email' in data) {
    return (
      <div className="flex flex-col gap-2">
        <p data-testid="account-email">{data.email}</p>
        <p data-testid="account-organisation">{data.organisation.name}</p>
        <Notes />
        <Button
          size="sm"
          variant="outline"
          data-testid="sign-out"
          onClick={async () => {
            await authClient.signOut();
            await refetch();
          }}
        >
          sign out
        </Button>
      </div>
    );
  }

  const submit = async (mode: 'in' | 'up') => {
    setProblem('');
    const result =
      mode === 'in'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: email });
    if (result.error) {
      // Shown rather than swallowed: a form that fails silently is the reason
      // people believe sign-in is broken when their password is wrong.
      setProblem(result.error.message ?? 'that did not work');
      return;
    }
    await refetch();
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        className="rounded border px-2 py-1"
        data-testid="email"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="rounded border px-2 py-1"
        data-testid="password"
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" data-testid="sign-in" onClick={() => void submit('in')}>
          sign in
        </Button>
        <Button size="sm" variant="outline" data-testid="sign-up" onClick={() => void submit('up')}>
          sign up
        </Button>
      </div>
      {problem !== '' && <p data-testid="account-problem">{problem}</p>}
    </div>
  );
}

const rootRoute = createRootRoute({
  component: () => (
    <QueryClientProvider client={queryClient}>
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
        <Outlet />
      </main>
    </QueryClientProvider>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <Card className="flex flex-col gap-3">
      <CardTitle>reference application</CardTitle>
      <Greeting />
      {/* A misspelled param name here is a compile error, not a broken link. */}
      <Link to="/greeting/$greetingId" params={{ greetingId: '1' }}>
        <Button size="sm" variant="outline">
          open by id
        </Button>
      </Link>
      <Link to="/account">
        <Button size="sm" variant="outline">
          account
        </Button>
      </Link>
    </Card>
  ),
});

const greetingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/greeting/$greetingId',
  component: function GreetingById() {
    const { greetingId } = greetingRoute.useParams();
    return (
      <Card className="flex flex-col gap-3">
        <CardTitle>greeting {greetingId}</CardTitle>
        <Greeting />
        <Link to="/">
          <Button size="sm" variant="outline">
            back
          </Button>
        </Link>
      </Card>
    );
  },
});

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/account',
  component: () => (
    <Card className="flex flex-col gap-3">
      <CardTitle>account</CardTitle>
      <Account />
      <Link to="/">
        <Button size="sm" variant="outline">
          back
        </Button>
      </Link>
    </Card>
  ),
});

const routeTree = rootRoute.addChildren([indexRoute, greetingRoute, accountRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
