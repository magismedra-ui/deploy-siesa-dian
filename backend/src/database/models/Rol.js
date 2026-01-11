const { DataTypes } = require("sequelize");
const { sequelize } = require("../connection");

const Rol = sequelize.define(
  "sys_roles",
  {
    // id se crea automáticamente por Sequelize como INTEGER PK AUTO_INCREMENT
    // si se quiere explícito:
    // id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "sys_roles",
    timestamps: true, // Crea createdAt y updatedAt
  }
);

module.exports = Rol;
