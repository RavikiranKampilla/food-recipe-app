
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const API_URL = 'http://localhost:5000/api/recipes'
  const AUTH_URL = 'http://localhost:5000/api/auth'

  const [recipes, setRecipes] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingRecipeId, setEditingRecipeId] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)

  const detailsRef = useRef(null)
  const formRef = useRef(null)
  const resultsRef = useRef(null)

  const [newRecipe, setNewRecipe] = useState({
    name: '',
    category: 'Breakfast',
    time: '',
    image: '',
    ingredients: '',
    instructions: ''
  })

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user')) || null
  )

  const [authMode, setAuthMode] = useState('')
  const [authData, setAuthData] = useState({
    name: '',
    email: '',
    password: ''
  })

  useEffect(() => {
    fetchRecipes()
  }, [])

  // Scroll to recipe details
  useEffect(() => {
    if (selectedRecipe && detailsRef.current) {
      detailsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }, [selectedRecipe])

  // Scroll to Add/Edit form
  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }, [showForm])

  async function fetchRecipes() {
    try {
      const response = await axios.get(API_URL)
      setRecipes(response.data)
    } catch (error) {
      console.error('Error fetching recipes:', error)
    }
  }

  // Login and registration
  async function handleAuth(e) {
    e.preventDefault()

    try {
      const response = await axios.post(
        `${AUTH_URL}/${authMode}`,
        authData
      )

      if (authMode === 'login') {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))

        setUser(response.data.user)
        setAuthMode('')
        setProfileOpen(false)
      } else {
        alert('Registration successful. Please login.')
        setAuthMode('login')
      }

      setAuthData({
        name: '',
        email: '',
        password: ''
      })

    } catch (error) {
      alert(error.response?.data?.message || 'Something went wrong')
    }
  }

  function handleAuthChange(e) {
    setAuthData({
      ...authData,
      [e.target.name]: e.target.value
    })
  }

  // Logout
  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    setUser(null)
    setShowForm(false)
    setSelectedRecipe(null)
    setEditingRecipeId(null)
    setProfileOpen(false)
    setAuthMode('')
  }

  // Add Recipe button
  function handleAddButton() {
    if (!user) {
      return
    }

    handleCancelForm()
    setShowForm(true)
  }

  // Delete Account
  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete your account and all your recipes? This action cannot be undone.'
    )

    if (!confirmed) {
      return
    }

    try {
      const token = localStorage.getItem('token')

      await axios.delete(`${AUTH_URL}/delete-account`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      handleLogout()
      await fetchRecipes()

      alert('Your account has been deleted successfully.')

    } catch (error) {
      console.error('Account deletion error:', error)
      alert(error.response?.data?.message || 'Unable to delete account')
    }
  }

  function isOwner(recipe) {
    return user && recipe.user === user.id
  }

  const categories = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Dessert']

  // Search and category filtering
  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.name
      .toLowerCase()
      .includes(search.toLowerCase().trim())

    const matchesCategory =
      category === 'All' || recipe.category === category

    return matchesSearch && matchesCategory
  })

  function handleSearchSubmit(e) {
    e.preventDefault()

    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  function handleInputChange(e) {
    const { name, value } = e.target

    setNewRecipe({
      ...newRecipe,
      [name]: value
    })
  }

  // Add or update recipe
  async function handleAddRecipe(e) {
    e.preventDefault()

    const ingredients = newRecipe.ingredients
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '')

    if (ingredients.length === 0) {
      alert('Please enter at least one ingredient')
      return
    }

    if (!newRecipe.instructions.trim()) {
      alert('Please enter cooking instructions')
      return
    }

    const recipe = {
      ...newRecipe,
      name: newRecipe.name.trim(),
      time: newRecipe.time.trim(),
      instructions: newRecipe.instructions.trim(),
      ingredients
    }

    const token = localStorage.getItem('token')

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }

      if (editingRecipeId) {
        await axios.put(
          `${API_URL}/${editingRecipeId}`,
          recipe,
          config
        )
      } else {
        await axios.post(API_URL, recipe, config)
      }

      await fetchRecipes()

      setNewRecipe({
        name: '',
        category: 'Breakfast',
        time: '',
        image: '',
        ingredients: '',
        instructions: ''
      })

      setEditingRecipeId(null)
      setShowForm(false)

    } catch (error) {
      console.error('Error saving recipe:', error)
      alert(error.response?.data?.message || 'Error saving recipe')
    }
  }

  // Edit recipe
  function handleEditRecipe(recipe) {
    if (!isOwner(recipe)) {
      return
    }

    setNewRecipe({
      name: recipe.name,
      category: recipe.category,
      time: recipe.time,
      image: recipe.image || '',
      ingredients: recipe.ingredients.join(', '),
      instructions: recipe.instructions
    })

    setEditingRecipeId(recipe._id)
    setSelectedRecipe(null)
    setShowForm(true)
  }

  // Delete a recipe
  async function handleDeleteRecipe(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this recipe?'
    )

    if (!confirmed) {
      return
    }

    const token = localStorage.getItem('token')

    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      await fetchRecipes()

      if (selectedRecipe?._id === id) {
        setSelectedRecipe(null)
      }

    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert(error.response?.data?.message || 'Error deleting recipe')
    }
  }

  function handleCancelForm() {
    setShowForm(false)
    setEditingRecipeId(null)

    setNewRecipe({
      name: '',
      category: 'Breakfast',
      time: '',
      image: '',
      ingredients: '',
      instructions: ''
    })
  }

  return (
    <div className="app">

      {/* Navbar */}
      <nav className="navbar">
        <h2>RecipeBook</h2>

        <div className="nav-actions">

          {user ? (
            <>
              <span className="welcome-text">
                Welcome, {user.name}
              </span>

              <button onClick={handleAddButton}>
                + Add Recipe
              </button>

              <div className="profile-container">
                <button
                  className="profile-icon"
                  onClick={() => setProfileOpen(!profileOpen)}
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>

                {profileOpen && (
                  <div className="profile-menu">
                    <h3>{user.name}</h3>
                    <p>{user.email}</p>

                    <button
                      className="delete-account-button"
                      onClick={handleDeleteAccount}
                    >
                      Delete Account
                    </button>

                    <button onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setAuthMode('login')}>
                Login
              </button>

              <button onClick={() => setAuthMode('register')}>
                Register
              </button>
            </>
          )}

        </div>
      </nav>

      {/* Login and Register Form */}
      {authMode && (
        <form className="auth-form" onSubmit={handleAuth}>
          <h2>
            {authMode === 'login' ? 'Login' : 'Register'}
          </h2>

          {authMode === 'register' && (
            <input
              type="text"
              name="name"
              placeholder="Your name"
              value={authData.name}
              onChange={handleAuthChange}
              required
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={authData.email}
            onChange={handleAuthChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={authData.password}
            onChange={handleAuthChange}
            required
          />

          <button type="submit">
            {authMode === 'login' ? 'Login' : 'Register'}
          </button>

          <button
            type="button"
            onClick={() => setAuthMode('')}
          >
            Cancel
          </button>
        </form>
      )}

      {/* Add/Edit Recipe Form */}
      {showForm && user && (
        <form
          className="recipe-form"
          onSubmit={handleAddRecipe}
          ref={formRef}
        >
          <h2>
            {editingRecipeId ? 'Edit Recipe' : 'Add a New Recipe'}
          </h2>

          <input
            type="text"
            name="name"
            placeholder="Recipe name"
            value={newRecipe.name}
            onChange={handleInputChange}
            required
          />

          <select
            name="category"
            value={newRecipe.category}
            onChange={handleInputChange}
          >
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
            <option value="Dessert">Dessert</option>
          </select>

          <input
            type="text"
            name="time"
            placeholder="Cooking time (e.g. 30 min)"
            value={newRecipe.time}
            onChange={handleInputChange}
            required
          />

          <input
            type="text"
            name="image"
            placeholder="Image URL (optional)"
            value={newRecipe.image}
            onChange={handleInputChange}
          />

          <textarea
            name="ingredients"
            placeholder="Ingredients (separate with commas)"
            value={newRecipe.ingredients}
            onChange={handleInputChange}
            required
          />

          <textarea
            name="instructions"
            placeholder="Cooking instructions"
            value={newRecipe.instructions}
            onChange={handleInputChange}
            required
          />

          <button type="submit">
            {editingRecipeId ? 'Update Recipe' : 'Save Recipe'}
          </button>

          <button type="button" onClick={handleCancelForm}>
            Cancel
          </button>
        </form>
      )}

      {/* Hero and Search */}
      <section className="hero">
        <h1>
          Discover Delicious <span>Recipes</span>
        </h1>

        <p className="subtitle">
          Find and share your favourite recipes.
        </p>

        <form className="search-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {search && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearch('')}
            >
              Clear
            </button>
          )}
        </form>

        <p className="search-count">
          {filteredRecipes.length}{' '}
          {filteredRecipes.length === 1 ? 'recipe' : 'recipes'} found
        </p>
      </section>

      {/* Recipe List */}
      <section className="recipe-section" ref={resultsRef}>

        <div className="categories">
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? 'active' : ''}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="recipe-grid">
          {filteredRecipes.length > 0 ? (
            filteredRecipes.map((recipe) => (
              <div className="recipe-card" key={recipe._id}>

                {recipe.image && (
                  <img src={recipe.image} alt={recipe.name} />
                )}

                <div className="recipe-info">
                  <span>{recipe.category}</span>
                  <h3>{recipe.name}</h3>
                  <p>⏱ {recipe.time}</p>

                  <button
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    View Recipe
                  </button>

                  {isOwner(recipe) && (
                    <>
                      <button
                        onClick={() => handleEditRecipe(recipe)}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteRecipe(recipe._id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="no-recipes">
              No recipes found. Try another search or category.
            </p>
          )}
        </div>

        {/* Recipe Details */}
        {selectedRecipe && (
          <div className="recipe-details" ref={detailsRef}>

            {selectedRecipe.image && (
              <img
                src={selectedRecipe.image}
                alt={selectedRecipe.name}
                className="detail-image"
              />
            )}

            <h2>{selectedRecipe.name}</h2>
            <p>Cooking Time: {selectedRecipe.time}</p>

            <h3>Ingredients</h3>

            <ul>
              {selectedRecipe.ingredients.map((ingredient, index) => (
                <li key={index}>{ingredient}</li>
              ))}
            </ul>

            <h3>Instructions</h3>
            <p>{selectedRecipe.instructions}</p>

            <button onClick={() => setSelectedRecipe(null)}>
              Close
            </button>

          </div>
        )}

      </section>
    </div>
  )
}

export default App
