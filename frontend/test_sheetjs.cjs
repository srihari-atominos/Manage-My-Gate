const XLSX = require('xlsx');

const parseCSV = (csvText) => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i+1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseLine(lines[0]).map(h => (h || '').toString().trim().toLowerCase());
  
  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (!values || values.length === 0 || (values.length === 1 && !values[0])) continue;

    const row = {};
    headers.forEach((header, index) => {
      let key = header;
      if (header.includes('unitnumber') || header.includes('unit number')) key = 'unitNumber';
      else if (header.includes('blockorbuilding') || header.includes('block') || header.includes('building')) key = 'blockOrBuilding';
      else if (header.includes('email')) key = 'email';
      else if (header.includes('residenttype') || header.includes('resident type')) key = 'residentType';
      else if (header.includes('unit type') || header.includes('type') || header.includes('configuration')) key = 'type';
      else if (header.includes('role')) key = 'roleName';

      row[key] = values[index] !== undefined && values[index] !== null ? values[index].toString().trim() : '';
    });

    row.isValidVilla = !!row.unitNumber;
    if (row.email) {
      row.isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email);
      row.isValidResidentType = ['Owner', 'Tenant', 'Family Member', 'Resident Owner', 'Family'].some((t) => (row.residentType || '').includes(t));
      if (!row.roleName && row.residentType) {
        if (row.residentType.includes('Owner')) row.roleName = 'Owner';
        else if (row.residentType.includes('Tenant')) row.roleName = 'Tenant';
        else if (row.residentType.includes('Family')) row.roleName = 'Family Member';
      }
      row.isValidRole = !!row.roleName;
    } else {
      row.isValidEmail = true;
      row.isValidResidentType = true;
      row.isValidRole = true;
    }
    row.isValid = row.isValidVilla && row.isValidEmail && row.isValidResidentType && row.isValidRole;
    parsed.push(row);
  }
  return parsed;
};

try {
  const csvStr = `"UnitNumber(101,102,103)","BlockOrBuilding","Unit Type(1BHA,2BHA,3BHA,Villa)","Floor Area (Sq Ft)","Occupancy Status(Occupied,Vacant)","Email","ResidentType(Family Member,Resident Owner,Tenant)"
"101","A-Block","3BHA","1200","Occupied","naveenpvn1702@gmail.com","Family Member"
"102","A-Block","3BHA","1200","Occupied","naveenpv5886@gmail.com","Family Member"
"103","B-Block","2BHA","1500","Vacant","naveen12rvb2022@gmail.com","Resident Owner"`;
  
  const parsed = parseCSV(csvStr);
  console.log('Parsed Rows:', parsed);
} catch (e) {
  console.error("Crash!", e.stack);
}
