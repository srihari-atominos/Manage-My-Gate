import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import userController from '../src/features/user/user.controller.js';
import ExcelJS from 'exceljs';
import stream from 'node:stream';

describe('Bulk Invite Excel Template & Unit Resolution Verification', () => {
  it('should generate template with Name, Email, Phone Number, Role, Unit Number and valid dropdown validations', async () => {
    const buffers = [];
    const mockRes = new stream.Writable({
      write(chunk, encoding, callback) {
        buffers.push(chunk);
        callback();
      },
    });

    mockRes.headers = {};
    mockRes.setHeader = (key, val) => {
      mockRes.headers[key] = val;
    };

    const mockReq = {
      tenant: { orgId: null },
      query: {},
      headers: {},
      user: { role: 'Platform Admin', isPlatform: true },
    };

    await userController.downloadBulkInviteTemplate(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    const fullBuffer = Buffer.concat(buffers);
    assert.ok(fullBuffer.length > 0, 'Workbook buffer should not be empty');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fullBuffer);

    const sheet = workbook.getWorksheet('Bulk Invite Users');
    assert.ok(sheet, 'Bulk Invite Users worksheet should exist');

    const headerRow = sheet.getRow(1);
    const headers = [
      headerRow.getCell(1).value,
      headerRow.getCell(2).value,
      headerRow.getCell(3).value,
      headerRow.getCell(4).value,
      headerRow.getCell(5).value,
    ];

    assert.deepEqual(
      headers,
      ['Name', 'Email', 'Phone Number', 'Role', 'Unit Number (Optional for Global Roles)'],
      'Headers must be Name, Email, Phone Number, Role, Unit Number (Optional for Global Roles)'
    );

    // Verify cell E1 note
    assert.ok(sheet.getCell('E1').note, 'Cell E1 should have an explanatory note');

    // Verify sample row 2
    const row2 = sheet.getRow(2);
    assert.equal(row2.getCell(1).value, 'John Doe');
    assert.equal(row2.getCell(2).value, 'resident.owner@example.com');
    assert.equal(row2.getCell(4).value, 'Resident Owner');

    // Verify sample row 3
    const row3 = sheet.getRow(3);
    assert.equal(row3.getCell(1).value, 'Jane Smith');
    assert.equal(row3.getCell(2).value, 'resident.tenant@example.com');
    assert.equal(row3.getCell(4).value, 'Resident Tenant');

    // Verify sample row 4 (Security Guard - Global Role with 'None' unit)
    const row4 = sheet.getRow(4);
    assert.equal(row4.getCell(1).value, 'Security Officer');
    assert.equal(row4.getCell(2).value, 'security.guard@example.com');
    assert.equal(row4.getCell(4).value, 'Security Guard');
    assert.equal(row4.getCell(5).value, 'None');

    // Verify sample row 5 (Community Admin - Global Role with 'None' unit)
    const row5 = sheet.getRow(5);
    assert.equal(row5.getCell(1).value, 'Admin Coordinator');
    assert.equal(row5.getCell(2).value, 'community.admin@example.com');
    assert.equal(row5.getCell(4).value, 'Community Admin');
    assert.equal(row5.getCell(5).value, 'None');

    // Verify DropdownData worksheet contains 'None' as the first option
    const dropdownSheet = workbook.getWorksheet('DropdownData');
    assert.ok(dropdownSheet, 'DropdownData worksheet should exist');
    assert.equal(dropdownSheet.getCell('A1').value, 'None', 'First option in DropdownData must be None');

    // Verify RoleData worksheet
    const roleSheet = workbook.getWorksheet('RoleData');
    assert.ok(roleSheet, 'RoleData worksheet should exist');

    const roles = [];
    roleSheet.eachRow((r) => {
      const val = r.getCell(1).value;
      if (val) roles.push(val);
    });

    // Verify 5 default community roles are present and NO platform admin roles
    assert.ok(roles.includes('Community Admin'), 'Should include Community Admin');
    assert.ok(roles.includes('Resident Owner'), 'Should include Resident Owner');
    assert.ok(roles.includes('Resident Tenant'), 'Should include Resident Tenant');
    assert.ok(roles.includes('Family Member'), 'Should include Family Member');
    assert.ok(roles.includes('Security Guard'), 'Should include Security Guard');

    const platformRoles = ['Platform Admin', 'Super Admin', 'Platform Super Admin'];
    for (const pr of platformRoles) {
      assert.ok(!roles.includes(pr), `Must not include platform role: ${pr}`);
    }

    // Verify data validation formula on Role column (Column D)
    const cellD2 = sheet.getCell('D2');
    assert.equal(cellD2.dataValidation.type, 'list');
    assert.equal(cellD2.dataValidation.errorTitle, 'Invalid Role');
    assert.ok(cellD2.dataValidation.formulae[0].startsWith('RoleData!$A$1:$A$'));
  });

  it('should correctly parse unit string variations in regex resolver', () => {
    const parseUnit = (rawUnitStr) => {
      const match = rawUnitStr.match(/^(?:Unit\s+)?([^\s(]+)(?:\s*\((.*?)\))?$/i);
      if (match) {
        return {
          unitNum: match[1]?.trim(),
          blockName: match[2]?.trim() || null,
        };
      }
      return null;
    };

    assert.deepEqual(parseUnit('101 (Block A)'), { unitNum: '101', blockName: 'Block A' });
    assert.deepEqual(parseUnit('Unit 101 (Block A)'), { unitNum: '101', blockName: 'Block A' });
    assert.deepEqual(parseUnit('Unit 101'), { unitNum: '101', blockName: null });
    assert.deepEqual(parseUnit('101'), { unitNum: '101', blockName: null });
    assert.deepEqual(parseUnit('B-204 (Tower 2)'), { unitNum: 'B-204', blockName: 'Tower 2' });
  });
});
