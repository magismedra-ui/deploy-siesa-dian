const { DataTypes } = require("sequelize");
const { sequelize } = require("../connection");
const bcrypt = require("bcryptjs");

const Usuario = sequelize.define(
  "sys_usuarios",
  {
    estado: {
      type: DataTypes.ENUM("ACTIVO", "INACTIVO"),
      defaultValue: "ACTIVO",
      allowNull: false,
    },
    nombre_completo: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    rol_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sys_roles',
        key: 'id'
      }
    },
  },
  {
    tableName: "sys_usuarios",
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password_hash) {
          const salt = await bcrypt.genSalt(10);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password_hash")) {
          const salt = await bcrypt.genSalt(10);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }
      },
    },
  }
);

// Método de instancia para comparar contraseñas
Usuario.prototype.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

module.exports = Usuario;
