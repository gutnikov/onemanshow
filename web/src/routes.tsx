import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

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

const routeTree = rootRoute.addChildren([indexRoute, greetingRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
