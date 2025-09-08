import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { executeQuery, executeSingleQuery, executeModificationQuery } from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface AuthToken {
  token: string;
  user: Omit<User, 'password_hash'>;
}

// Função para gerar token JWT
export const generateToken = (userId: number, username: string): string => {
  return jwt.sign(
    { 
      userId, 
      username,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Função para verificar token JWT
export const verifyToken = (token: string): { userId: number; username: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      userId: decoded.userId,
      username: decoded.username
    };
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return null;
  }
};

// Função para fazer hash da senha
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Função para verificar senha
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// Função para fazer login
export const login = async (credentials: LoginCredentials): Promise<AuthToken | null> => {
  try {
    const { username, password } = credentials;
    
    // Buscar usuário no banco
    const query = 'SELECT * FROM users WHERE username = ? AND is_active = 1';
    const user = await executeSingleQuery<User & { password_hash: string }>(query, [username]);
    
    if (!user) {
      throw new Error('Usuário não encontrado ou inativo');
    }
    
    // Verificar senha
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Senha incorreta');
    }
    
    // Atualizar último login
    await executeQuery(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );
    
    // Gerar token
    const token = generateToken(user.id, user.username);
    
    // Retornar dados do usuário sem a senha
    const { password_hash, ...userWithoutPassword } = user;
    
    return {
      token,
      user: userWithoutPassword
    };
    
  } catch (error) {
    console.error('Erro no login:', error);
    throw error;
  }
};

// Função para registrar novo usuário
export const register = async (userData: RegisterData): Promise<AuthToken> => {
  try {
    const { username, email, password } = userData;
    
    // Verificar se usuário já existe
    const existingUser = await executeSingleQuery<User>(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUser) {
      throw new Error('Usuário ou email já existe');
    }
    
    // Fazer hash da senha
    const hashedPassword = await hashPassword(password);
    
    // Inserir novo usuário
    const insertQuery = `
      INSERT INTO users (username, email, password_hash, is_active)
      VALUES (?, ?, ?, 1)
    `;
    
    const result = await executeModificationQuery(insertQuery, [username, email, hashedPassword]);
    
    // Buscar usuário criado
    const newUser = await executeSingleQuery<User & { password_hash: string }>(
      'SELECT * FROM users WHERE id = ?',
      [result.insertId!]
    );
    
    // Gerar token
    const token = generateToken(newUser.id, newUser.username);
    
    // Retornar dados do usuário sem a senha
    const { password_hash, ...userWithoutPassword } = newUser;
    
    return {
      token,
      user: userWithoutPassword
    };
    
  } catch (error) {
    console.error('Erro no registro:', error);
    throw error;
  }
};

// Função para buscar usuário por ID
export const getUserById = async (userId: number): Promise<User | null> => {
  try {
    const query = 'SELECT id, username, email, is_active, last_login, created_at, updated_at FROM users WHERE id = ? AND is_active = 1';
    return await executeSingleQuery<User>(query, [userId]);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return null;
  }
};

// Função para buscar usuário por token
export const getUserByToken = async (token: string): Promise<User | null> => {
  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return null;
    }
    
    return await getUserById(decoded.userId);
  } catch (error) {
    console.error('Erro ao buscar usuário por token:', error);
    return null;
  }
};

// Middleware para verificar autenticação
export const authenticateToken = async (req: any): Promise<User | null> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return null;
    }
    
    return await getUserByToken(token);
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return null;
  }
};

// Função para alterar senha
export const changePassword = async (userId: number, currentPassword: string, newPassword: string): Promise<boolean> => {
  try {
    // Buscar usuário atual
    const user = await executeSingleQuery<User & { password_hash: string }>(
      'SELECT * FROM users WHERE id = ? AND is_active = 1',
      [userId]
    );
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    // Verificar senha atual
    const isValidPassword = await verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Senha atual incorreta');
    }
    
    // Fazer hash da nova senha
    const hashedNewPassword = await hashPassword(newPassword);
    
    // Atualizar senha
    await executeQuery(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, userId]
    );
    
    return true;
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    throw error;
  }
};

// Função para desativar usuário
export const deactivateUser = async (userId: number): Promise<boolean> => {
  try {
    await executeQuery(
      'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
    
    return true;
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    throw error;
  }
};

export default {
  generateToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  login,
  register,
  getUserById,
  getUserByToken,
  authenticateToken,
  changePassword,
  deactivateUser
};
