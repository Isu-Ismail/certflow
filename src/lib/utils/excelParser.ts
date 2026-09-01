import * as XLSX from 'xlsx';
import type { Dataset, StudentRecord } from '../types';

export function parseExcelFile(file: File): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Read the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (!rawRows || rawRows.length === 0) {
          throw new Error('File is empty or contains no valid tabular data.');
        }

        // Clean headers and normalize records
        const sampleRow = rawRows[0];
        const columns = Object.keys(sampleRow).map(k => k.trim());

        const records: StudentRecord[] = rawRows.map((row, idx) => {
          const cleanRecord: StudentRecord = { id: `std_${idx + 1}` };
          for (const key of Object.keys(row)) {
            const cleanKey = key.trim();
            let val = row[key];
            if (cleanKey.toLowerCase().includes('date') && typeof val === 'number') {
              // Convert Excel serial date
              const dateObj = new Date((val - 25569) * 86400 * 1000);
              if (!isNaN(dateObj.getTime())) {
                val = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
              }
            }
            cleanRecord[cleanKey] = val;
          }
          return cleanRecord;
        });

        resolve({
          name: file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name,
          columns,
          records
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export const SAMPLE_DATASETS: Dataset[] = [
  {
    name: 'Hackathon 2026 - Finalists & Winners',
    fileName: 'hackathon_2026_winners.csv',
    columns: ['Name', 'Position', 'Project_Name', 'Track', 'Score', 'Issue_Date', 'Certificate_ID'],
    records: [
      {
        id: 'std_1',
        Name: 'Alex Rivera',
        Position: '1',
        Project_Name: 'AI Code Assistant',
        Track: 'Artificial Intelligence',
        Score: '98',
        Issue_Date: 'August 31, 2026',
        Certificate_ID: 'CERT-2026-001'
      },
      {
        id: 'std_2',
        Name: 'Sophia Chen',
        Position: '2',
        Project_Name: 'EcoTrack Analytics',
        Track: 'Sustainability',
        Score: '94',
        Issue_Date: 'August 31, 2026',
        Certificate_ID: 'CERT-2026-002'
      },
      {
        id: 'std_3',
        Name: 'Marcus Vance',
        Position: '3',
        Project_Name: 'CyberGuard Shield',
        Track: 'Cybersecurity',
        Score: '91',
        Issue_Date: 'August 31, 2026',
        Certificate_ID: 'CERT-2026-003'
      },
      {
        id: 'std_4',
        Name: 'Elena Rostova',
        Position: 'Honorable Mention',
        Project_Name: 'HealthPulse IoT',
        Track: 'Healthcare',
        Score: '89',
        Issue_Date: 'August 31, 2026',
        Certificate_ID: 'CERT-2026-004'
      },
      {
        id: 'std_5',
        Name: 'David K. Miller',
        Position: 'Participant',
        Project_Name: 'DeFi Wallet',
        Track: 'FinTech',
        Score: '85',
        Issue_Date: 'August 31, 2026',
        Certificate_ID: 'CERT-2026-005'
      },
      {
        id: 'std_6',
        Name: 'Aisha Patel',
        Position: '1',
        Project_Name: 'Smart AgTech Sensor',
        Track: 'IoT & Robotics',
        Score: '99',
        Issue_Date: 'August 31, 2026',
        Certificate_ID: 'CERT-2026-006'
      }
    ]
  },
  {
    name: 'Web Dev Mastery Bootcamp 2026',
    fileName: 'bootcamp_graduates.xlsx',
    columns: ['Name', 'Course', 'Grade', 'Projects_Completed', 'Issue_Date', 'Certificate_ID'],
    records: [
      {
        id: 'std_101',
        Name: 'Lucas Thorne',
        Course: 'Full-Stack Svelte & Node',
        Grade: 'A+',
        Projects_Completed: '6',
        Issue_Date: 'August 30, 2026',
        Certificate_ID: 'DEV-2026-881'
      },
      {
        id: 'std_102',
        Name: 'Amara Jackson',
        Course: 'Full-Stack Svelte & Node',
        Grade: 'A',
        Projects_Completed: '5',
        Issue_Date: 'August 30, 2026',
        Certificate_ID: 'DEV-2026-882'
      },
      {
        id: 'std_103',
        Name: 'Mateo Garcia',
        Course: 'UI/UX & Frontend Design',
        Grade: 'Pass',
        Projects_Completed: '4',
        Issue_Date: 'August 30, 2026',
        Certificate_ID: 'DEV-2026-883'
      }
    ]
  }
];
