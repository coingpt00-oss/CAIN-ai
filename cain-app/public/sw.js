self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};

  event.waitUntil(
    self.registration.showNotification(data.title || "CAIN", {
      body: data.body || "",
      icon: "/icons/cain-192.png",
      badge: "/icons/cain-192.png"
    })
  );
});
