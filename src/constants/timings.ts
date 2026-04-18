/**
 * Centralised animation and cadence budgets, in milliseconds.
 *
 * Tuning rule: keep `TRAVEL_MS + IMPACT_MS + RETURN_MS <= ANNOUNCER_CADENCE_MS`
 * so live-region announcements never get trampled by the next combat beat.
 */

/** How long the attacker's clone flies toward the target. */
export const TRAVEL_MS = 350;

/** Shake + flash on impact. */
export const IMPACT_MS = 150;

/** Post-impact settle before unblocking the queue. */
export const RETURN_MS = 400;

/** Reduced-motion substitute for TRAVEL_MS + IMPACT_MS. */
export const REDUCED_FLASH_MS = 100;
/** Reduced-motion hold so the announcer has time to speak. */
export const REDUCED_HOLD_MS = 500;

/** Card tilt + fade when a creature dies. */
export const TILT_FADE_MS = 350;

/** Floating damage number lifetime. */
export const DAMAGE_FLOAT_MS = 600;

/** Delay before the AI plays a card / starts attacking. */
export const AI_PLAY_DELAY_MS = 900;
/** Spacing between consecutive AI attacks. */
export const AI_ATTACK_DELAY_MS = 1100;
/** Pause before the AI passes the turn back. */
export const AI_END_DELAY_MS = 600;

/** Minimum hold per live-region message so screen readers catch up. */
export const ANNOUNCER_CADENCE_MS = 1100;

/** Auto-dismiss for the "face attack blocked" alert. */
export const FACE_BLOCKED_NOTE_MS = 3000;

/** Pulse cadence for the "Opponent thinking" indicator. */
export const OPPONENT_PULSE_MS = 1200;
