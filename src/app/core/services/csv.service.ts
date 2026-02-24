import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CsvService {
  /**
   * Exports an array of objects to a CSV file.
   * @param data Array of objects to export
   * @param fileName Name of the file (without extension)
   */
  exportToCsv(data: any[], fileName: string = 'export'): void {
    if (!data || !data.length) {
      return;
    }

    const separator = ',';
    const keys = Object.keys(data[0]);
    
    // Create header row
    const csvContent = [
      keys.join(separator),
      ...data.map(row => 
        keys.map(k => {
          let cell = row[k] === null || row[k] === undefined ? '' : row[k];
          cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
          if (cell.search(/("|,|\n)/g) >= 0) {
            cell = `"${cell}"`;
          }
          return cell;
        }).join(separator)
      )
    ].join('\n');

    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
