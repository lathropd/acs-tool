const mysql = require('mysql2/promise')
const d3 = require('d3')
const fs = require('fs')
const dotenv = require('dotenv')


async function main() {

  // get the command line parameters
  let year = process.argv[2]
  let acsYears = process.argv[3]

  // error if they're missing
  if (year == null || acsYears == null) {
    console.log('Syntax: node create_headers.js YEAR ACSTYPE')
    process.exit()
  }

  const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_CATALOG
  }


  // get the files
  const groupsText = fs.readFileSync(`./data/raw/acs/${year}_${acsYears}_yr/metadata/tables.csv`, 'utf8')
  const variablesText = fs.readFileSync(`./data/raw/acs/${year}_${acsYears}_yr/metadata/variables.csv`, 'utf8')

  // pqrse the files
  const psv = d3.dsvFormat('|')
  const groups = psv.parseRows(groupsText)
  const variables = psv.parseRows(variablesText)

  try {
    await insertCsv(groups, 'census_variable_groups', ['name', 'description', 'url'], dbConfig)
  } catch (e) {
    console.log(e)
  }

  try {
    await insertCsv(variables, 'census_variables', ['name', 'label', 'concept', 'data_type'], dbConfig)
  } catch (e) {
    console.log(e)
  }

}

async function insertCsv(rows, tableName, columns, dbConfig) {

  // connect to the database
  try { var connection = await mysql.createConnection(dbConfig) }
  catch (e) { throw e }


  // construct the insert statement
  let q = 'REPLACE INTO ' + tableName
    + ' (' + columns.join(',') + ') '
    + 'VALUES (' + columns.map(d => '?').join(',') + '); '

  for (row of rows) {
    row = row.map(d => d.replace(/"|\\/g, ''))

    try {
      await connection.execute(q, row)
    }
    catch (e) {
      console.log("=============")
      console.log(q)
      console.log(row)
      console.log(e)
      process.exit()
    }

  }

  connection.close()
}




if (require.main === module) {
  dotenv.config()
  main()
}



