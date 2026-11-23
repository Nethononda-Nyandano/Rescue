import type { RescueType } from '@/utils/rescueService';

export const MAX_PROBLEM_DESCRIPTION_LENGTH = 500;

export function validateProblemDescription(
    service: RescueType,
    description: string,
): string | null {
    if (service !== 'diagnostics') return null;
    const trimmed = description.trim();
    if (!trimmed) return 'Describe the vehicle problem before continuing.';
    if (trimmed.length > MAX_PROBLEM_DESCRIPTION_LENGTH) {
        return `Keep the description to ${MAX_PROBLEM_DESCRIPTION_LENGTH} characters or fewer.`;
    }
    return null;
}