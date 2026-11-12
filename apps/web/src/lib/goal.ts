/** XP of the daily goal per minute of study: 10 min = 50 XP, 20 min = 100 XP, 30 min = 150 XP (game design, §3.1). */
export const GOAL_XP_PER_MINUTE = 5;

export function dailyGoalXp(dailyMinutes: number): number {
  return Math.round(dailyMinutes * GOAL_XP_PER_MINUTE);
}
