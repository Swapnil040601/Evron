export const getRecords = async (
  tenantDb, tableName
) => {
   const sql = "SELECT t.*, concat(u.first_name, ' ', u.middle_name, ' ', u.last_name) as created_by_name FROM "+tableName+" t "
              + "LEFT JOIN users u ON u.id=t.created_by "
              + "WHERE u.deleted_at IS NULL";
    return await tenantDb.query(sql);
};

export const getRecord = async (
  tenantDb, tableName, id
) => {
   const sql = "SELECT t.*, concat(u.first_name, ' ', u.middle_name, ' ', u.last_name) as created_by_name FROM "+tableName+" t "
              + "LEFT JOIN users u ON u.id=t.created_by "
              + "WHERE u.deleted_at IS NULL AND t.id="+id;
    
    const results = await tenantDb.query(sql, [id]);
    return results[0] || null;
};
