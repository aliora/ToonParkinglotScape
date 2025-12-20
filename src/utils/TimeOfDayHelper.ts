/**
 * Time of Day Helper
 * Automatically determines Day/Night based on current time
 */

/**
 * Günün saatine göre gece/gündüz belirleme
 * Gündüz: 06:00 - 18:00
 * Gece: 18:00 - 06:00
 */
export function getAutoTimeOfDay(): 'Day' | 'Night' {
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'Day' : 'Night';
}

/**
 * Bir sonraki gece/gündüz geçişine kadar kalan süre (ms)
 */
export function getTimeUntilNextTransition(): number {
    const now = new Date();
    const hour = now.getHours();

    let nextTransition: Date;
    if (hour >= 6 && hour < 18) {
        // Gündüz - 18:00'e kadar bekle
        nextTransition = new Date(now);
        nextTransition.setHours(18, 0, 0, 0);
    } else {
        // Gece - 06:00'a kadar bekle
        nextTransition = new Date(now);
        if (hour >= 18) {
            nextTransition.setDate(nextTransition.getDate() + 1);
        }
        nextTransition.setHours(6, 0, 0, 0);
    }

    return nextTransition.getTime() - now.getTime();
}

/**
 * Check if currently daytime
 */
export function isDaytime(): boolean {
    return getAutoTimeOfDay() === 'Day';
}
