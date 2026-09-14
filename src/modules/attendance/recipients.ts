export function isAttendanceManager(user: {
  active: boolean;
  role: { name: string };
  profile: {
    position: string;
    telegramUserId: string | null;
    telegramChatId: string | null;
    telegramVerified: boolean;
  } | null;
}) {
  const p = user.profile;
  return Boolean(
    user.active &&
      p?.telegramVerified &&
      p.telegramUserId &&
      p.telegramChatId === p.telegramUserId &&
      (user.role.name === "SUPER_ADMIN" ||
        ["direktor", "director", "bosh administrator"].includes(
          p.position.trim().toLowerCase(),
        )),
  );
}
