// ============================================================
// Code.gs — Main Router + Sheet Setup
// แหม่มเบเกอรี่ HR System
// ============================================================


// ─── GET Router ────────────────────────────────────────────
function doGet(e) {
  var p = e.parameter;
  try {
    switch (p.action) {
      case 'getEmployees':      return ok(getEmployees());
      case 'getTodayStatus':    return ok(getTodayStatus(p.empID));
      case 'getAttendance':     return ok(getAttendance(p));
      case 'getPeriods':        return ok(getPeriods());
      case 'getPayroll':        return ok(getPayroll(p));
      case 'getLoans':          return ok(getLoans(p));
      case 'getConfig':         return ok(getConfig());
      case 'exportCSV':         return csvResponse(exportCSV(p));
      default:                  return ok({ error: 'Unknown action: ' + p.action });
    }
  } catch (err) {
    return ok({ error: err.message, stack: err.stack });
  }
}

// ─── POST Router ───────────────────────────────────────────
function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); }
  catch (err) { return ok({ error: 'Invalid JSON: ' + err.message }); }

  try {
    switch (d.action) {
      case 'clockIn':             return ok(clockIn(d));
      case 'clockOut':            return ok(clockOut(d));
      case 'addEmployee':         return ok(addEmployee(d));
      case 'updateEmployee':      return ok(updateEmployee(d));
      case 'deleteEmployee':      return ok(deleteEmployee(d));
      case 'saveFaceDescriptor':  return ok(saveFaceDescriptor(d));
      case 'createPeriod':        return ok(createPeriod(d));
      case 'savePayrollRow':      return ok(savePayrollRow(d));
      case 'confirmPayroll':      return ok(confirmPayroll(d));
      case 'addManualDeduction':  return ok(addManualDeduction(d));
      case 'addLoan':             return ok(addLoan(d));
      case 'updateLoan':          return ok(updateLoan(d));
      case 'updateConfig':        return ok(updateConfig(d));
      case 'verifyAdmin':         return ok(verifyAdmin(d));
      case 'setupSheets':         return ok(setupSheets());
      default:                    return ok({ error: 'Unknown action: ' + d.action });
    }
  } catch (err) {
    return ok({ error: err.message, stack: err.stack });
  }
}

// ─── Helpers ───────────────────────────────────────────────
function ok(data) {
  var out = ContentService.createTextOutput(JSON.stringify(data));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function csvResponse(csvText) {
  var out = ContentService.createTextOutput(csvText);
  out.setMimeType(ContentService.MimeType.CSV);
  return out;
}

function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  var ss = SpreadsheetApp.create('แหม่มเบเกอรี่ HR');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}

function getSheet(name) {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function sheetToObjects(sh) {
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = { _row: 0 };
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  }).map(function(obj, i) { obj._row = i + 2; return obj; });
}

function thaiDate(d) {
  if (!d) d = new Date();
  var dd = d.getDate().toString().padStart(2,'0');
  var mm = (d.getMonth()+1).toString().padStart(2,'0');
  var yyyy = d.getFullYear() + 543;
  return dd + '/' + mm + '/' + yyyy;
}

function fmtTime(d) {
  if (!d) d = new Date();
  return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}

// ─── Sheet Initialisation ──────────────────────────────────
function setupSheets() {
  var sheets = {
    'Employees': ['EmpID','ชื่อ-นามสกุล','ชื่อเล่น','ประเภท','ตำแหน่ง','วันที่เริ่มงาน','สถานะ','ค่าจ้าง/วัน','OT/ชม.','วันลาคงเหลือ','เบอร์โทร','FaceDesc1','FaceDesc2','FaceDesc3'],
    'Attendance': ['วันที่','EmpID','ชื่อ','เวลาเข้า','เวลาออก','ชั่วโมงรวม','สถานะ','GPS_เข้า','GPS_ออก'],
    'PayrollPeriods': ['PeriodID','ชื่องวด','วันเริ่ม','วันสิ้นสุด','สถานะ','สร้างเมื่อ'],
    'PayrollDetail': ['PeriodID','EmpID','ชื่อ','วันทำงาน','ยอดฐาน','OT','ค่าอาหาร','เบี้ยขยัน','เบิกล่วงหน้า','หักมาสาย','หักขาดงาน','หักเงินกู้','หักสะสม','เงินสุทธิ','สถานะ'],
    'ManualDeductions': ['DeductID','PeriodID','EmpID','ประเภท','วันที่','รายละเอียด','ยอดหัก','หมายเหตุ'],
    'Loans': ['LoanID','EmpID','ชื่อ','วันที่กู้','ยอดกู้','หักต่องวด','ชำระแล้ว','คงเหลือ','สถานะ','หมายเหตุ'],
    'Config': ['Key','Value']
  };

  Object.entries(sheets).forEach(function(entry) {
    var name = entry[0], headers = entry[1];
    var sh = getSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(headers);
      sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#5C3D2E').setFontColor('#FFFFFF');
      sh.setFrozenRows(1);
    }
  });

  // Default config values
  var configSh = getSheet('Config');
  var configData = sheetToObjects(configSh);
  var defaults = {
    'GPS_LAT': '13.7563',
    'GPS_LNG': '100.5018',
    'GPS_RADIUS': '200',
    'ADMIN_PASSWORD': 'admin1234',
    'FOOD_PER_DAY': '50',
    'OT_RATE_MULTIPLIER': '1.5',
    'WORK_START': '08:00',
    'LATE_AFTER_MIN': '15',
    'VACATION_DAYS_PER_YEAR': '3',
    'DILIGENCE_BONUS': '500'
  };
  Object.entries(defaults).forEach(function(kv) {
    if (!configData.find(function(r) { return r.Key === kv[0]; })) {
      configSh.appendRow([kv[0], kv[1]]);
    }
  });

  return { success: true, message: 'ตั้งค่า Sheets สำเร็จ' };
}

function getConfig() {
  var rows = sheetToObjects(getSheet('Config'));
  var cfg = {};
  rows.forEach(function(r) { cfg[r.Key] = r.Value; });
  return cfg;
}

function updateConfig(d) {
  var sh = getSheet('Config');
  var rows = sheetToObjects(sh);
  Object.entries(d.config).forEach(function(kv) {
    var existing = rows.find(function(r) { return r.Key === kv[0]; });
    if (existing) {
      sh.getRange(existing._row, 2).setValue(kv[1]);
    } else {
      sh.appendRow([kv[0], kv[1]]);
    }
  });
  return { success: true };
}

function verifyAdmin(d) {
  var cfg = getConfig();
  return { valid: d.password === cfg.ADMIN_PASSWORD };
}
