"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bell } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PwaPushToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  );
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(
    null
  );

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setSubscription(sub);
            setIsSubscribed(true);
          }
        });
      });
    }
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (!registration) {
      toast.error("Service worker not registered yet. Please refresh.");
      return;
    }

    if (checked) {
      try {
        const result = await Notification.requestPermission();
        if (result === "granted") {
          const response = await fetch("/api/web-push/vapid-public-key");
          const data = await response.json();
          const convertedVapidKey = urlBase64ToUint8Array(data.publicKey);

          const sub = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          });

          await fetch("/api/web-push/subscription", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(sub),
          });

          setSubscription(sub);
          setIsSubscribed(true);
          toast.success("Push notifications enabled!");
        } else {
          toast.error("Notification permission denied.");
        }
      } catch (error) {
        console.error("Failed to subscribe:", error);
        toast.error("Failed to enable push notifications.");
      }
    } else {
      if (subscription) {
        try {
          await fetch("/api/web-push/subscription", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });

          await subscription.unsubscribe();
          setSubscription(null);
          setIsSubscribed(false);
          toast.success("Push notifications disabled.");
        } catch (error) {
          console.error("Failed to unsubscribe:", error);
          toast.error("Failed to disable push notifications.");
        }
      }
    }
  };

  if (!("serviceWorker" in navigator && "PushManager" in window)) {
    return (
      <div className="text-sm text-muted-foreground">
        Push notifications are not supported in this browser.
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Bell className="w-5 h-5 text-muted-foreground" />
      <Label htmlFor="push-toggle" className="flex-1 cursor-pointer">
        Enable push notifications on this device
      </Label>
      <Switch
        id="push-toggle"
        checked={isSubscribed}
        onCheckedChange={handleToggle}
      />
    </div>
  );
}
