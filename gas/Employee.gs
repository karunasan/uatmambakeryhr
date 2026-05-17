// ============================================================
// Employee.gs — Employee CRUD + Face Registration
// ============================================================

function getEmployees() {
  var rows = sheetToObjects(getSheet('Employees'));
  return rows
    .map(function(r) {
      return {
        empID: r['EmpID'], name: r['ชื่อ-นามสกุล'], nickname: r['ชื่อเล่น'],
        type: r['ประเภท'], position: r['ตำแหน่ง'], startDate: r['วันที่เริ่มงาน'],
        status: r['สถานะ'], dailyRate: r['ค่าจ้าง/วัน'], otRate: r['OT/ชม.'],
        vacationLeft: r['วันลาคงเหลือ'], phone: r['เบอร์โทร'],
        hasFace: !!(r['FaceDesc1'] || r['FaceDesc2'] || r['FaceDesc3']),
        face1: r['FaceDesc1'] || '', face2: r['FaceDesc2'] || '', face3: r['FaceDesc3'] || '',
        _row: r._row
      };
    })
    .sort(function(a, b) {
      // M ก่อน D, แล้วเรียงตาม ID
      var aType = a.empID.charAt(0);
      var bType = b.empID.charAt(0);
      if (aType !== bType) return aType === 'M' ? -1 : 1;
      return a.empID.localeCompare(b.empID);
    });
}

function getNextEmpID(type) {
  var rows = sheetToObjects(getSheet('Employees'));
  var prefix = type + new Date().getFullYear();  // e.g. M2026
  var existing = rows
    .map(function(r) { return r['EmpID']; })
    .filter(function(id) { return id && id.startsWith(prefix); })
    .map(function(id) { return parseInt(id.replace(prefix, ''), 10); })
    .filter(function(n) { return !isNaN(n); });
  var next = existing.length > 0 ? Math.max.apply(null, existing) + 1 : 1;
  return prefix + next.toString().padStart(2, '0');
}

function addEmployee(d) {
  var sh = getSheet('Employees');
  var empID = getNextEmpID(d.type); // M or D
  var cfg = getConfig();
  sh.appendRow([
    empID, d.name, d.nickname, d.type, d.position,
    thaiDate(new Date()), 'Active',
    d.dailyRate || 0, d.otRate || 0,
    cfg.VACATION_DAYS_PER_YEAR || 3,
    d.phone || '',
    '', '', ''
  ]);
  return { success: true, empID: empID };
}

function updateEmployee(d) {
  var sh = getSheet('Employees');
  var rows = sheetToObjects(sh);
  var emp = rows.find(function(r) { return r['EmpID'] === d.empID; });
  if (!emp) return { error: 'ไม่พบพนักงาน: ' + d.empID };

  var updates = {
    'ชื่อ-นามสกุล': d.name, 'ชื่อเล่น': d.nickname,
    'ตำแหน่ง': d.position, 'สถานะ': d.status,
    'ค่าจ้าง/วัน': d.dailyRate, 'OT/ชม.': d.otRate,
    'วันลาคงเหลือ': d.vacationLeft, 'เบอร์โทร': d.phone
  };

  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  Object.entries(updates).forEach(function(kv) {
    var col = headers.indexOf(kv[0]) + 1;
    if (col > 0 && kv[1] !== undefined) sh.getRange(emp._row, col).setValue(kv[1]);
  });
  return { success: true };
}

function deleteEmployee(d) {
  var sh = getSheet('Employees');
  var rows = sheetToObjects(sh);
  var emp = rows.find(function(r) { return r['EmpID'] === d.empID; });
  if (!emp) return { error: 'ไม่พบพนักงาน' };
  // Soft delete: set status to Inactive
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var col = headers.indexOf('สถานะ') + 1;
  sh.getRange(emp._row, col).setValue('Inactive');
  return { success: true };
}

function saveFaceDescriptor(d) {
  var sh = getSheet('Employees');
  var rows = sheetToObjects(sh);
  var emp = rows.find(function(r) { return r['EmpID'] === d.empID; });
  if (!emp) return { error: 'ไม่พบพนักงาน' };

  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var colMap = { 1: 'FaceDesc1', 2: 'FaceDesc2', 3: 'FaceDesc3' };
  var col = headers.indexOf(colMap[d.slot]) + 1;
  if (col === 0) return { error: 'Invalid slot' };
  sh.getRange(emp._row, col).setValue(JSON.stringify(d.descriptor));
  return { success: true, slot: d.slot };
}
