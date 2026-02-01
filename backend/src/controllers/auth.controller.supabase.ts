import type { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import {
  validateRollNumber,
  constructRollNumber,
  generateEmail,
  validatePassword,
  validateName,
  validateBranch,
  validate5DigitRoll
} from '../utils/validation.util.js';
import type { SignupRequest, LoginRequest } from '../types/auth.types.js';

/**
 * SIGNUP - Create user using Supabase Auth
 */
export async function signup(req: Request, res: Response) {
  try {
    const { degreeType, rollNumber, name, gender, branch, password } = req.body as SignupRequest;

    // Validate inputs
    if (!degreeType || !rollNumber || !name || !gender || !branch || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate 5-digit roll number
    if (!validate5DigitRoll(rollNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Roll number must be 1-5 digits'
      });
    }

    // Validate name
    if (!validateName(name)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid name format'
      });
    }

    // Validate branch
    if (!validateBranch(branch)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid branch code'
      });
    }

    // Validate password
    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Construct full roll number and email
    const fullRollNumber = constructRollNumber(degreeType, rollNumber);
    const email = generateEmail(fullRollNumber);

    // Check if user already exists in Supabase
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('roll_number')
      .eq('roll_number', fullRollNumber)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create auth user in Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for now
      user_metadata: {
        name,
        roll_number: fullRollNumber,
        gender,
        branch
      }
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user account'
      });
    }

    // Create user profile in database
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        roll_number: fullRollNumber,
        email,
        name,
        gender,
        branch,
        degree_type: degreeType
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Cleanup: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user profile'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        userId: authData.user.id,
        email,
        rollNumber: fullRollNumber
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * LOGIN - Authenticate user using Supabase Auth
 */
export async function login(req: Request, res: Response) {
  try {
    const { rollNo, password } = req.body as LoginRequest;

    // Validate inputs
    if (!rollNo || !password) {
      return res.status(400).json({
        success: false,
        message: 'Roll number and password are required'
      });
    }

    // Validate roll number format
    if (!validateRollNumber(rollNo)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid roll number format'
      });
    }

    const email = generateEmail(rollNo);

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: profile,
        session: authData.session
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * TEST CONNECTION - Verify Supabase connection
 */
export async function testConnection(req: Request, res: Response) {
  try {
    // Test database query
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Database connection failed',
        error: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Supabase connection successful via HTTPS API',
      details: {
        method: 'Supabase REST API (HTTPS)',
        port: '443 (HTTPS - no blocking)',
        status: 'Connected'
      }
    });

  } catch (error) {
    console.error('Connection test error:', error);
    return res.status(500).json({
      success: false,
      message: 'Connection test failed'
    });
  }
}
