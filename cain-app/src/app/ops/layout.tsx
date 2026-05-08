export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        {children}
        <script>
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js').then(()=> {
                console.log("SW registered");
              });
            }
          `}
        </script>
      </body>
    </html>
  );
}
