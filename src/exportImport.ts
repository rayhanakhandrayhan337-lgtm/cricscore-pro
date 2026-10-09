// Simple Export/Import Service - No API Required
// Uses browser's built-in download/upload functionality

export interface BatsmanStats {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissal?: string;
}

export interface BowlerStats {
  playerId: string;
  playerName: string;
  overs: number;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  extras: number;
}

export interface Innings {
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: { wides: number; noBalls: number };
  batsmenStats: Record<string, BatsmanStats>;
  bowlersStats: Record<string, BowlerStats>;
  currentBatsmen: [string, string];
  currentBowler: string;
  ballEvents: any[];
  isCompleted: boolean;
}

export interface Match {
  id: string;
  team1: { id: string; name: string };
  team2: { id: string; name: string };
  venue: string;
  createdAt: string;
  result?: string;
  innings?: Innings[];
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

// Export match summary to PDF
export async function exportMatchToPDF(match: Match): Promise<void> {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('CricScore Pro - Match Summary', 105, 20, { align: 'center' });
    
    // Match Info
    doc.setFontSize(12);
    doc.text(`${match.team1.name} vs ${match.team2.name}`, 105, 35, { align: 'center' });
    doc.text(`Venue: ${match.venue}`, 105, 45, { align: 'center' });
    doc.text(`Date: ${new Date(match.createdAt).toLocaleDateString()}`, 105, 55, { align: 'center' });
    
    if (match.result) {
      doc.setFontSize(14);
      doc.setTextColor(0, 128, 0);
      doc.text(`Result: ${match.result}`, 105, 70, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
    
    let yPos = 85;
    
    // Innings details
    match.innings?.forEach((innings: Innings, idx: number) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      const battingTeam = match.team1.id === innings.battingTeamId ? match.team1 : match.team2;
      
      doc.setFontSize(14);
      doc.text(`Innings ${idx + 1}: ${battingTeam.name}`, 20, yPos);
      doc.setFontSize(12);
      doc.text(`Score: ${innings.runs}/${innings.wickets} (${innings.overs}.${innings.balls} overs)`, 20, yPos + 10);
      
      yPos += 20;
      
      // Batting table
      const battingData = Object.values(innings.batsmenStats).map((batsman: BatsmanStats) => [
        batsman.playerName,
        batsman.runs.toString(),
        batsman.balls.toString(),
        batsman.fours.toString(),
        batsman.sixes.toString(),
        batsman.isOut ? 'Out' : 'Not Out'
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Batsman', 'Runs', 'Balls', '4s', '6s', 'Status']],
        body: battingData,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      // Bowling table
      const bowlingData = Object.values(innings.bowlersStats)
        .filter((bowler: BowlerStats) => bowler.overs > 0 || bowler.wickets > 0)
        .map((bowler: BowlerStats) => [
          bowler.playerName,
          `${bowler.overs}.${bowler.balls}`,
          bowler.runs.toString(),
          bowler.wickets.toString(),
          bowler.extras.toString()
        ]);
      
      if (bowlingData.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Bowler', 'Overs', 'Runs', 'Wickets', 'Extras']],
          body: bowlingData,
          theme: 'striped',
          headStyles: { fillColor: [147, 51, 234] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }
      
      yPos += 10;
    });
    
    // Save PDF
    const fileName = `Match_Summary_${match.team1.name}_vs_${match.team2.name}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    console.log(`✅ PDF exported: ${fileName}`);
  } catch (error) {
    console.error('❌ PDF export failed:', error);
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
