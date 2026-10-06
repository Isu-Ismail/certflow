import type { Sheet } from './types';

const COLUMNS = ['Name', 'Roll Number', 'Team', 'Title', 'Year'];
const ROWS = [
  ['A. M. ISMAIL', '2023507030', 'Team 1', 'Profile Projector', '3rd year'],
  ['V. B. JAYARAM', '2023507040', 'Team 1', 'Profile Projector', '3rd year'],
  ['M. RAM BARATH', '2023507039', 'Team 1', 'Profile Projector', '3rd year'],
  ['R. MONISH KUMAR', '2023507038', 'Team 1', 'Profile Projector', '3rd year'],
  ['Mothinath G', '2023507009', 'Team 2', 'Micrometer', '3rd year'],
  ['Madusudarsanan J', '2023507021', 'Team 2', 'Micrometer', '3rd year'],
  ['Prabakaran K', '2023507302', 'Team 2', 'Micrometer', '3rd year'],
  ['Venugopal R', '2023507307', 'Team 2', 'Micrometer', '3rd year'],
  ['Nivedhitha V', '2023507015', 'Team 3', 'Profilometer', '3rd year'],
  ['Litikaa R', '2023507012', 'Team 3', 'Profilometer', '3rd year'],
  ['Abiseik P', '2023507013', 'Team 3', 'Profilometer', '3rd year'],
  ['Sanjay Kumar S', '2023507018', 'Team 3', 'Profilometer', '3rd year'],
];

export function makeSampleSheet(): Sheet {
  return {
    fileName: 'data.csv',
    columns: [...COLUMNS],
    rows: ROWS.map((r) => Object.fromEntries(COLUMNS.map((c, i) => [c, r[i]]))),
  };
}
