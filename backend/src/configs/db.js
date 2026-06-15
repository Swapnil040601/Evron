import mysql from "mysql2/promise";

export async function createDBConnection(database = null) {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
    multipleStatements: true,
  });
}