import type { RestaurantPublicProfile } from './types';
import type { FullMenu } from '../menu/types';

export const CATEGORY_ITEMS = [
    { name: 'All', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80', cuisine: undefined },
    { name: 'Biriyani', image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=400&q=80', cuisine: 'Biriyani' },
    { name: 'Dosa', image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&q=80', cuisine: 'Dosa' },
    { name: 'South Indian', image: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=400&q=80', cuisine: 'South Indian' },
    { name: 'Rice', image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80', cuisine: 'Rice' },
    { name: 'Chicken', image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&q=80', cuisine: 'Chicken' },
    { name: 'Burger', image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&q=80', cuisine: 'Burger' },
    { name: 'North Indian', image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&q=80', cuisine: 'North Indian' },
];

export const MOCK_RESTAURANTS: RestaurantPublicProfile[] = [];
export const MOCK_MENUS: Record<string, FullMenu> = {};
