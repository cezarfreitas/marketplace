import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Usuario, LoginUsuario, CreateUsuario, UsuarioResponse } from '@/types/database';

// Configuração do banco de dados seo_data
const dbConfig = {
  host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
  port: parseInt(process.env.DB_PORT || '3342'),
  user: process.env.DB_USER || 'seo_data',
  password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
  database: process.env.DB_NAME || 'seo_data',
  charset: 'utf8mb4'
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Função para conectar ao banco
async function getConnection() {
  const mysql = require('mysql2/promise');
  return await mysql.createConnection(dbConfig);
}

// Função para fazer hash da senha
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Função para verificar senha
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Função para gerar JWT token
export function generateToken(user: UsuarioResponse): string {
  const payload = { 
    id: user.id, 
    email: user.email, 
    role: user.role 
  };
  
  return (jwt as any).sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Função para verificar JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET as string);
  } catch (error) {
    return null;
  }
}

// Função para fazer login
export async function loginUser(loginData: LoginUsuario): Promise<{ success: boolean; user?: UsuarioResponse; token?: string; message?: string }> {
  let connection;
  
  try {
    connection = await getConnection();
    
    // Buscar usuário por email
    const [users] = await connection.execute(
      'SELECT * FROM usuarios WHERE email = ? AND is_active = TRUE',
      [loginData.email]
    );
    
    if (!users || users.length === 0) {
      return { success: false, message: 'Usuário não encontrado ou inativo' };
    }
    
    const user = users[0] as Usuario;
    
    // Verificar se o usuário está bloqueado
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      return { success: false, message: 'Usuário temporariamente bloqueado' };
    }
    
    // Verificar senha
    const isValidPassword = await verifyPassword(loginData.senha, user.senha);
    
    if (!isValidPassword) {
      // Incrementar tentativas de login
      await connection.execute(
        'UPDATE usuarios SET login_attempts = login_attempts + 1 WHERE id = ?',
        [user.id]
      );
      
      // Bloquear usuário após 5 tentativas
      if (user.login_attempts >= 4) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30); // Bloquear por 30 minutos
        
        await connection.execute(
          'UPDATE usuarios SET locked_until = ? WHERE id = ?',
          [lockUntil, user.id]
        );
        
        return { success: false, message: 'Muitas tentativas de login. Usuário bloqueado por 30 minutos.' };
      }
      
      return { success: false, message: 'Senha incorreta' };
    }
    
    // Login bem-sucedido - resetar tentativas e atualizar último login
    await connection.execute(
      'UPDATE usuarios SET login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?',
      [user.id]
    );
    
    // Remover senha do objeto de resposta
    const userResponse: UsuarioResponse = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      last_login: user.last_login,
      avatar_url: user.avatar_url,
      telefone: user.telefone,
      departamento: user.departamento,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
    
    const token = generateToken(userResponse);
    
    return { success: true, user: userResponse, token };
    
  } catch (error: any) {
    console.error('Erro no login:', error);
    return { success: false, message: 'Erro interno do servidor' };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Função para criar usuário
export async function createUser(userData: CreateUsuario): Promise<{ success: boolean; user?: UsuarioResponse; message?: string }> {
  let connection;
  
  try {
    connection = await getConnection();
    
    // Verificar se email já existe
    const [existingUsers] = await connection.execute(
      'SELECT id FROM usuarios WHERE email = ?',
      [userData.email]
    );
    
    if (existingUsers && existingUsers.length > 0) {
      return { success: false, message: 'Email já está em uso' };
    }
    
    // Fazer hash da senha
    const hashedPassword = await hashPassword(userData.senha);
    
    // Inserir usuário
    const [result] = await connection.execute(
      `INSERT INTO usuarios (nome, email, senha, role, is_active, avatar_url, telefone, departamento) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userData.nome,
        userData.email,
        hashedPassword,
        userData.role || 'viewer',
        userData.is_active !== false,
        userData.avatar_url || null,
        userData.telefone || null,
        userData.departamento || null
      ]
    );
    
    // Buscar usuário criado
    const [newUsers] = await connection.execute(
      'SELECT * FROM usuarios WHERE id = ?',
      [(result as any).insertId]
    );
    
    const newUser = newUsers[0] as Usuario;
    
    // Remover senha do objeto de resposta
    const userResponse: UsuarioResponse = {
      id: newUser.id,
      nome: newUser.nome,
      email: newUser.email,
      role: newUser.role,
      is_active: newUser.is_active,
      last_login: newUser.last_login,
      avatar_url: newUser.avatar_url,
      telefone: newUser.telefone,
      departamento: newUser.departamento,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at
    };
    
    return { success: true, user: userResponse };
    
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    return { success: false, message: 'Erro interno do servidor' };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Função para buscar usuário por ID
export async function getUserById(id: number): Promise<UsuarioResponse | null> {
  let connection;
  
  try {
    connection = await getConnection();
    
    const [users] = await connection.execute(
      'SELECT * FROM usuarios WHERE id = ? AND is_active = TRUE',
      [id]
    );
    
    if (!users || users.length === 0) {
      return null;
    }
    
    const user = users[0] as Usuario;
    
    // Remover senha do objeto de resposta
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      last_login: user.last_login,
      avatar_url: user.avatar_url,
      telefone: user.telefone,
      departamento: user.departamento,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
    
  } catch (error: any) {
    console.error('Erro ao buscar usuário:', error);
    return null;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Função para listar usuários
export async function getUsers(): Promise<UsuarioResponse[]> {
  let connection;
  
  try {
    connection = await getConnection();
    
    const [users] = await connection.execute(
      'SELECT * FROM usuarios ORDER BY created_at DESC'
    );
    
    return (users as Usuario[]).map(user => ({
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      last_login: user.last_login,
      avatar_url: user.avatar_url,
      telefone: user.telefone,
      departamento: user.departamento,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));
    
  } catch (error: any) {
    console.error('Erro ao listar usuários:', error);
    return [];
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Função para verificar permissões
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    'viewer': 1,
    'editor': 2,
    'admin': 3
  };
  
  return roleHierarchy[userRole as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole as keyof typeof roleHierarchy];
}
