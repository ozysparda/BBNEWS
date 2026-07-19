function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <h1>Query OK</h1>
    </QueryClientProvider>
  );
}
