const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const util = require('util');

const config = require('./config').config;

const sql = require('mssql');
const exists = util.promisify(fs.exists);
const parse = require('csv-parse');

async function main() {
  // load file
  const file = await fsp.readFile(config.importFile);

  parse(file, { columns: true }, async (err, output) => {
    if (err) {
      console.log(err);
      return;
    }

    const dbFormatted = [];

    for (const row of output) {
      const formatted = {};

      const keys = Object.keys(row);
      for (const k of keys) {
        const mappedKey = config.map[k];
        const fn = config.transform[k];
        formatted[mappedKey] = fn(row[k]);
      }

      dbFormatted.push(formatted);
    }

    // refactor to create temp table, insert, then use SQL to join
    if (dbFormatted.length > 0) {
      await createTemp(dbFormatted);
      try {
        await updateRecords(dbFormatted[0]);
      } finally {
        try {
          await cleanup();
        } catch {}
      }
    }
  });
}

async function createTemp(records): Promise<void> {
  return new Promise((resolve, reject) => {
    sql.connect(
      {
        user: config.db.user,
        password: config.db.password,
        server: config.db.server,
        port: config.db.port,
        database: config.db.database,
        timeout: 500000,
      },
      (err) => {
        if (err) {
          reject(err);
        } else {
          const rq = new sql.Request();
          let query = `
          Create table FakeNames
            (
              Id int identity(1,1)`;
          const keys = Object.keys(records[0]);
          for (const k of keys) {
            query += `, ${k} nvarchar(255)`;
          }
          query += `
);

          `;
          let columns = '';
          let delim = '';
          for (const k of keys) {
            columns += `${delim}[${k}]`;
            delim = ', ';
          }

          for (const r of records) {
            let values = '';
            let vdelim = '';
            for (const k of keys) {
              values += `${vdelim} '${r[k].replace(/'/g, "''")}'`;
              vdelim = ', ';
            }
            query += `insert into FakeNames (${columns}) values (${values})
  `;
          }

          rq.query(query, (err, data) => {
            if (err) {
              reject(err);
            } else {
              sql.close();

              return resolve(data.recordset);
            }
          });
        }
      }
    );
  });
}

async function updateRecords(record): Promise<void> {
  return new Promise((resolve, reject) => {
    sql.connect(
      {
        user: config.db.user,
        password: config.db.password,
        server: config.db.server,
        port: config.db.port,
        database: config.db.database,
        timeout: 500000,
      },
      (err) => {
        if (err) {
          reject(err);
        } else {
          const rq = new sql.Request();

          let updates = '';
          let columns = '';
          let delim = '';

          const keys = Object.keys(record);
          for (const k of keys) {
            updates += delim + `${config.db.table}.[${k}] = fn.[${k}]`;
            columns += delim + `[${k}]`;
            delim = ', ';
          }

          const query = `
          UPDATE  ${config.db.table}
SET     
    ${updates}
FROM    ${config.db.table}
        CROSS APPLY
        (   SELECT  TOP 1 
          ${columns}
            FROM    FakeNames TABLESAMPLE(1000 ROWS)
            ORDER BY NEWID(), ${config.db.table}.${config.db.primaryKey}
        ) fn
        `;
          rq.query(query, (err, data) => {
            if (err) {
              reject(err);
            } else {
              sql.close();
              resolve();
            }
          });
        }
      }
    );
  });
}

async function cleanup(): Promise<void> {
  return new Promise((resolve, reject) => {
    sql.connect(
      {
        user: config.db.user,
        password: config.db.password,
        server: config.db.server,
        port: config.db.port,
        database: config.db.database,
      },
      (err) => {
        if (err) {
          reject(err);
        } else {
          const rq = new sql.Request();
          const query = `DROP TABLE FakeNames`;
          rq.query(query, (err, data) => {
            if (err) {
              reject(err);
            } else {
              sql.close();
              resolve();
            }
          });
        }
      }
    );
  });
}

(async () => {
  await main();
})();
