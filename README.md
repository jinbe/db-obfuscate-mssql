# db-obfuscate-mssql

Replace private user details on a database with randomly generated content.

# Fake names

Order bulk fake names from https://www.fakenamegenerator.com/order.php. Order a .csv file. Save this file as fakenames.csv.

# Configure

Create `config.ts`

Example:
`
const moment = require('moment');

const config = {
importFile: 'fakenames.csv',
db: {
user: '',
password: '',
server: '127.0.0.1',
port: 1433,
database: '',
table: 'TableName',
primaryKey: 'Key',
},
map: {
'﻿Gender': 'Gender',
GivenName: 'FirstName',
Surname: 'LastName',
StreetAddress: 'MailingAddress',
Birthday: 'DOB',
State: 'State',
City: 'Suburb',
ZipCode: 'Postcode',
CountryFull: 'Country',
EmailAddress: 'EmailAddress',
Occupation: 'Occupation',
Latitude: 'Lat',
Longitude: 'Lng',
},
transform: {
'﻿Gender': (s) => (s === 'male' ? 'M' : 'F'),
GivenName: (s) => s,
Surname: (s) => s,
StreetAddress: (s) => s,
Birthday: (s) => moment(s, 'MM/DD/YYYY').format('YYYY-MM-DD'),
State: (s) => s,
City: (s) => s,
ZipCode: (s) => s,
CountryFull: (s) => s,
EmailAddress: (s) => s,
Occupation: (s) => s,
Latitude: (s) => s,
Longitude: (s) => s,
},
};

export { config };
`
