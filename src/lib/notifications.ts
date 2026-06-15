import { Capacitor } from "@capacitor/core";

// Helper único para alertar o lojista quando chega um pedido novo.
// No app nativo (Capacitor) usa LocalNotifications (bandeja do sistema + som).
// No navegador/PWA usa a Notification API + som + vibração como fallback.

/** Pede a permissão de notificação no contexto certo (nativo x web). */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const { display } = await LocalNotifications.requestPermissions();
      return display === "granted";
    } catch {
      return false;
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function vibrate(): void {
  import("@capacitor/haptics")
    .then(({ Haptics }) => {
      Haptics.vibrate({ duration: 500 }).catch(() => fallbackVibrate());
    })
    .catch(() => fallbackVibrate());
}

function fallbackVibrate(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([300, 120, 300]);
  }
}

function playSound(): void {
  if (typeof window === "undefined") return;
  try {
    const audio = new Audio("/sounds/success.mp3");
    audio.volume = 0.6;
    audio.play().catch(() => null);
  } catch {
    // áudio indisponível ou bloqueado por falta de gesto do usuário
  }
}

/** Dispara o alerta de pedido novo imediatamente. */
export async function fireOrderNotification(title: string, body: string): Promise<void> {
  vibrate();

  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now() % 2_147_483_000,
            title,
            body,
            // schedule.at no passado dispara na hora; sem `at` também dispara imediato
            smallIcon: "ic_stat_icon_config_sample",
          },
        ],
      });
      return;
    } catch {
      // cai no fallback web abaixo
    }
  }

  playSound();

  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icon.png", badge: "/icon.png", tag: "nexo-order" });
  } catch {
    // Notification pode falhar em alguns contextos (ex.: precisa de SW)
  }
}
