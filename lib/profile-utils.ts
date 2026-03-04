import { Timestamp } from "firebase/firestore";

const MANDATORY_PROFILE_FIELDS = [
    'name', 'email', 'phone', 'dob', 'gender', 'occupation', 'upi', 
    'favoriteFormat', 'favoriteTeam', 'favoriteCricketer'
] as const;

type ProfileField = typeof MANDATORY_PROFILE_FIELDS[number];

const isFieldFilled = (fieldName: ProfileField, value: any): boolean => {
    if (value === undefined || value === null) return false;
    
    switch(fieldName) {
        case 'name':
        case 'occupation':
        case 'favoriteCricketer':
            return typeof value === 'string' && value.trim().length >= 2;
        case 'email':
            return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
        case 'phone':
             return typeof value === 'string' && /^\d{10,}$/.test(value.trim());
        case 'upi':
            return typeof value === 'string' && /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(value.trim());
        case 'dob':
            return (value instanceof Timestamp && !isNaN(value.toDate().getTime())) || (typeof value === 'string' && !isNaN(new Date(value).getTime()));
        case 'gender':
        case 'favoriteFormat':
        case 'favoriteTeam':
             return typeof value === 'string' && value.trim().length > 0;
        default:
            return !!value;
    }
}

/**
 * Checks if a user profile object has all mandatory fields filled out correctly.
 * @param profile - The user profile object.
 * @returns `true` if the profile is complete, `false` otherwise.
 */
export function isProfileConsideredComplete(profile: any | null): boolean {
    if (!profile) return false;
    return MANDATORY_PROFILE_FIELDS.every(field => isFieldFilled(field, profile[field]));
}

/**
 * ✅ Validate that UPI cannot be changed after it's been set
 * @param oldProfile - The existing profile (from Firestore)
 * @param newProfile - The profile data being updated
 * @throws Error if trying to change UPI after it's already set
 */
export function validateUPICannotBeChanged(oldProfile: any, newProfile: any): void {
    // If UPI already exists in the old profile
    if (oldProfile?.upi && oldProfile.upi.trim().length > 0) {
        // Check if someone is trying to change it
        if (newProfile?.upi && newProfile.upi !== oldProfile.upi) {
            throw new Error('UPI ID cannot be changed after it has been set. Contact support if you need to update it.');
        }
    }
}

/**
 * ✅ NEW: Validate that Name cannot be changed after it's been set
 * @param oldProfile - The existing profile (from Firestore)
 * @param newProfile - The profile data being updated
 * @throws Error if trying to change Name after it's already set
 */
export function validateNameCannotBeChanged(oldProfile: any, newProfile: any): void {
    // If Name already exists in the old profile
    if (oldProfile?.name && oldProfile.name.trim().length > 0) {
        // Check if someone is trying to change it
        if (newProfile?.name && newProfile.name !== oldProfile.name) {
            throw new Error('Name cannot be changed after it has been set. Contact support if you need to update it.');
        }
    }
}

/**
 * ✅ NEW: Validate all immutable fields at once
 * @param oldProfile - The existing profile (from Firestore)
 * @param newProfile - The profile data being updated
 * @throws Error if trying to change any immutable field
 */
export function validateImmutableFields(oldProfile: any, newProfile: any): void {
    validateNameCannotBeChanged(oldProfile, newProfile);
    validateUPICannotBeChanged(oldProfile, newProfile);
}
