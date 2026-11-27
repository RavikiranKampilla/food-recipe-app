const express = require('express')
const Recipe = require('../models/Recipe')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

// Get all recipes - Public
router.get('/', async (req, res) => {
  try {
    const recipes = await Recipe.find()
    res.json(recipes)
  } catch (error) {
    res.status(500).json({ message: 'Failed to get recipes' })
  }
})

// Add recipe - Login required
router.post('/', authMiddleware, async (req, res) => {
  try {
    const recipe = new Recipe({
      ...req.body,
      user: req.user.id
    })

    await recipe.save()
    res.status(201).json(recipe)
  } catch (error) {
    res.status(400).json({ message: 'Failed to add recipe' })
  }
})

// Update recipe - Owner only
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const recipe = await Recipe.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    )

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found or access denied' })
    }

    res.json(recipe)
  } catch (error) {
    res.status(400).json({ message: 'Failed to update recipe' })
  }
})

// Delete recipe - Owner only
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const recipe = await Recipe.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    })

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found or access denied' })
    }

    res.json({ message: 'Recipe deleted successfully' })
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete recipe' })
  }
})

module.exports = router