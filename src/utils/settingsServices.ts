

import { Ionicons } from '@expo/vector-icons';

export interface menutype {
    key: number;
    title: string;
    icon: keyof typeof Ionicons.glyphMap | string;
    route?: string;
    subtitle?: string;
    badge?: string;
}

export interface MenuSection {
    id: string;
    title: string;
    items: menutype[];
}

export const menuSections: MenuSection[] = [
    {
        id: 'account',
        title: 'Account & Profile',
        items: [
            {
                key: 1,
                title: 'Edit Profile',
                subtitle: 'Name, phone number and email',
                icon: 'person-outline',
                route: '/edit_profile',
            },
            {
                key: 2,
                title: 'Emergency Contacts',
                subtitle: 'Notify loved ones in emergencies',
                icon: 'call-outline',
                route: '/emergency_contacts',
            },
            {
                key: 3,
                title: 'My Vehicles',
                subtitle: 'Manage saved cars and details',
                icon: 'car-outline',
                route: '/(tabs)/vehicle',
            },
        ],
    },
    {
        id: 'preferences',
        title: 'Preferences & Security',
        items: [
            {
                key: 4,
                title: 'Notifications',
                subtitle: 'Alerts and rescue update preferences',
                icon: 'notifications-outline',
                route: '/notifications',
            },
            {
                key: 5,
                title: 'Privacy & Security',
                subtitle: 'Passcodes and security settings',
                icon: 'shield-checkmark-outline',
                route: '/privacy',
            },
        ],
    },
    {
        id: 'support',
        title: 'Support & About',
        items: [
            {
                key: 6,
                title: 'Help & Support',
                subtitle: 'FAQs, chat support and guides',
                icon: 'help-circle-outline',
                route: '/support',
            },
            {
                key: 7,
                title: 'About ResQ',
                subtitle: 'Version 1.0.0 & legal info',
                icon: 'information-circle-outline',
                route: '/about',
            },
        ],
    },
];

export const menu: menutype[] = menuSections.flatMap(section => section.items);