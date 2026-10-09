// Simple Export/Import Service - No API Required
// Uses browser's built-in download/upload functionality

export interface Match {
  id: string;
  [key: string]: any;
}

// Export all matches to a JSON file
export function exportMatchesToJSON(matches: Match[]): void {
  try {
    const dataStr = JSON.stringify(matches, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `cricscore_matches_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`✅ Exported ${matches.length} matches`);
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

// Import matches from a JSON file
export function importMatchesFromJSON(file: File): Promise<Match[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const matches = JSON.parse(content) as Match[];
        
        if (!Array.isArray(matches)) {
          reject(new Error('Invalid file format: expected an array of matches'));
          return;
        }
        
        console.log(`✅ Imported ${matches.length} matches`);
        resolve(matches);
      } catch (error) {
        console.error('❌ Import failed:', error);
        reject(new Error('Failed to parse JSON file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

// Export single match to JSON
export function exportSingleMatchToJSON(match: Match): void {
  try {
    const dataStr = JSON.stringify(match, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `match_${match.id}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`✅ Exported match: ${match.id}`);
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

// Export matches to CSV format (for spreadsheet)
export function exportMatchesToCSV(matches: Match[]): void {
  try {
    const headers = [
      'Match ID',
      'Team 1',
      'Team 2',
      'Venue',
      'Date',
      'Status',
      'Result',
      'Team 1 Score',
      'Team 2 Score'
    ];
    
    const rows = matches.map(match => {
      const team1 = match.team1?.name || '';
      const team2 = match.team2?.name || '';
      const venue = match.venue || '';
      const date = match.createdAt ? new Date(match.createdAt).toLocaleDateString() : '';
      const status = match.status || '';
      const result = match.result || '';
      const team1Score = match.innings?.[0] ? `${match.innings[0].runs}/${match.innings[0].wickets}` : '';
      const team2Score = match.innings?.[1] ? `${match.innings[1].runs}/${match.innings[1].wickets}` : '';
      
      return [
        match.id,
        team1,
        team2,
        venue,
        date,
        status,
        result,
        team1Score,
        team2Score
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `cricscore_matches_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`✅ Exported ${matches.length} matches to CSV`);
  } catch (error) {
    console.error('❌ CSV export failed:', error);
    throw error;
  }
}
