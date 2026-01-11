const bcrypt = require('bcryptjs');
const Usuario = require('./models/Usuario');
const Rol = require('./models/Rol');

/**
 * Inicializa los datos básicos del sistema (roles y usuario administrador)
 */
const seedDatabase = async () => {
	try {
		console.log('[Seed] Inicializando datos básicos del sistema...');

		// Crear rol Admin si no existe
		const [adminRol, createdRol] = await Rol.findOrCreate({
			where: { nombre: 'Admin' },
			defaults: {
				nombre: 'Admin',
				descripcion: 'Acceso general'
			}
		});

		if (createdRol) {
			console.log('[Seed] Rol Admin creado');
		} else {
			console.log('[Seed] Rol Admin ya existe');
		}

		// Verificar si el usuario admin existe
		let adminUser = await Usuario.findOne({ where: { email: 'admin@administrador.com' } });

		if (!adminUser) {
			// Crear usuario administrador
			adminUser = await Usuario.create({
				nombre_completo: 'Administrador',
				email: 'admin@administrador.com',
				password_hash: 'admin00', // Se hasheará automáticamente por el hook beforeCreate
				rol_id: adminRol.id,
				estado: 'ACTIVO'
			});
			console.log('[Seed] Usuario administrador creado');
		} else {
			// Verificar si la contraseña está hasheada correctamente
			// Si la longitud es menor a 50 caracteres, probablemente está en texto plano
			if (adminUser.password_hash.length < 50) {
				console.log('[Seed] Usuario administrador encontrado con contraseña en texto plano, actualizando...');
				adminUser.password_hash = 'admin00'; // Se hasheará automáticamente por el hook beforeUpdate
				await adminUser.save();
				console.log('[Seed] Contraseña del usuario administrador actualizada');
			} else {
				console.log('[Seed] Usuario administrador ya existe con contraseña hasheada');
			}

			// Asegurar que el nombre completo esté actualizado
			if (adminUser.nombre_completo !== 'Administrador') {
				adminUser.nombre_completo = 'Administrador';
				await adminUser.save();
				console.log('[Seed] Nombre del usuario administrador actualizado');
			}

			// Asegurar que el rol esté asignado
			if (!adminUser.rol_id || adminUser.rol_id !== adminRol.id) {
				adminUser.rol_id = adminRol.id;
				await adminUser.save();
				console.log('[Seed] Rol asignado al usuario administrador');
			}
		}

		console.log('[Seed] Inicialización de datos básicos completada');
	} catch (error) {
		console.error('[Seed] Error al inicializar datos básicos:', error);
		// No lanzar el error para que el servidor pueda iniciar aunque falle el seed
	}
};

module.exports = { seedDatabase };
