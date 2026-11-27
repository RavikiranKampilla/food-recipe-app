
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Recipe = require('../models/Recipe')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Please fill in all fields'
      })
    }

    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return res.status(400).json({
        message: 'Email already registered'
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = new User({
      name,
      email,
      password: hashedPassword
    })

    await user.save()

    res.status(201).json({
      message: 'Registration successful'
    })

  } catch (error) {
    res.status(500).json({
      message: 'Registration failed'
    })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(400).json({
        message: 'Invalid email or password'
      })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(400).json({
        message: 'Invalid email or password'
      })
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    })

  } catch (error) {
    res.status(500).json({
      message: 'Login failed'
    })
  }
})

// Delete account and all recipes created by the user
router.delete('/delete-account', authMiddleware, async (req, res) => {
  try {
    await Recipe.deleteMany({ user: req.user.id })
    await User.findByIdAndDelete(req.user.id)

    res.json({
      message: 'Account and your recipes deleted successfully'
    })

  } catch (error) {
    console.error('Account deletion error:', error)

    res.status(500).json({
      message: 'Unable to delete account'
    })
  }
})

module.exports = router
