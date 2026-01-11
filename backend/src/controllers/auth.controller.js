const jwt = require('jsonwebtoken');
const Usuario = require('../database/models/Usuario');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }
  
    // Buscar usuario
    const user = await Usuario.findOne({ where: { email } });
  
    // Validar usuario inexistente o contraseña incorrecta genéricamente
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
  
    // Verificar estado
    if (user.estado !== 'ACTIVO') {
      return res.status(403).json({ message: 'Usuario inactivo' });
    }
  
    // Verificar contraseña
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
  
    // Generar token
    const secret = process.env.JWT_SECRET || 'clave_secreta_segura_siesa_dian';
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        nombre: user.nombre_completo,
        rol: user.rol_id || 'user'
      }, 
      secret, 
      { expiresIn: '8h' }
    );
    
    const userData = user.toJSON();
    delete userData.password_hash;
  
    return res.json({ 
      message: 'Login exitoso',
      token,
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { login };
