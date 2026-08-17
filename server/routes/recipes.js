import { Router } from 'express';
import { getCache, setCache } from '../cache.js';
import * as Sentry from '@sentry/node';

const router = Router();
const H = 3600 * 1000;

// Fetch helper with standard timeout
async function fetchWithTimeout(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// 1. GET /areas -> list of cuisine areas that actually have recipes, sorted
//
// TheMealDB's list.php?a=list returns a static list of ~190 nationalities,
// most of which have zero recipes (and some real areas use different
// spellings than that list, e.g. "India" not "Indian"). Instead, derive the
// area list from actual recipe data by scanning all meals a-z and collecting
// the distinct strArea values, so only cuisines with real recipes show up.
router.get('/areas', async (req, res) => {
  const cacheKey = 'recipes-areas';
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const results = await Promise.all(
      letters.map(l => fetchWithTimeout(`https://www.themealdb.com/api/json/v1/1/search.php?f=${l}`).catch(() => ({ meals: [] })))
    );
    const areaSet = new Set();
    for (const data of results) {
      for (const m of data.meals || []) {
        if (m.strArea) areaSet.add(m.strArea);
      }
    }
    const areas = [...areaSet].sort();
    setCache(cacheKey, areas, 24 * H);
    res.json(areas);
  } catch (e) {
    console.error('[recipes]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
});

// 2. GET /categories -> list of categories
router.get('/categories', async (req, res) => {
  const cacheKey = 'recipes-categories';
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const data = await fetchWithTimeout('https://www.themealdb.com/api/json/v1/1/list.php?c=list');
    const categories = (data.meals || []).map(m => m.strCategory).sort();
    setCache(cacheKey, categories, 24 * H);
    res.json(categories);
  } catch (e) {
    console.error('[recipes]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
});

// 3. GET /by-area?area=Indian
router.get('/by-area', async (req, res) => {
  const { area } = req.query;
  if (!area) return res.status(400).json({ error: 'Missing area query param' });

  const cacheKey = `recipes-by-area-${area}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const data = await fetchWithTimeout(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(area)}`);
    const meals = (data.meals || []).map(m => ({
      id: m.idMeal,
      name: m.strMeal,
      thumbnail: m.strMealThumb,
      area
    }));
    setCache(cacheKey, meals, 6 * H);
    res.json(meals);
  } catch (e) {
    console.error('[recipes]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
});

// 4. GET /by-category?category=Seafood
router.get('/by-category', async (req, res) => {
  const { category } = req.query;
  if (!category) return res.status(400).json({ error: 'Missing category query param' });

  const cacheKey = `recipes-by-category-${category}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const data = await fetchWithTimeout(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`);
    const meals = (data.meals || []).map(m => ({
      id: m.idMeal,
      name: m.strMeal,
      thumbnail: m.strMealThumb,
      category
    }));
    setCache(cacheKey, meals, 6 * H);
    res.json(meals);
  } catch (e) {
    console.error('[recipes]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
});

// 5. GET /search?q=butter+chicken
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  const cacheKey = `recipes-search-${q}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const data = await fetchWithTimeout(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`);
    const meals = (data.meals || []).map(m => ({
      id: m.idMeal,
      name: m.strMeal,
      thumbnail: m.strMealThumb,
      area: m.strArea,
      category: m.strCategory
    }));
    setCache(cacheKey, meals, 6 * H);
    res.json(meals);
  } catch (e) {
    console.error('[recipes]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
});

// 6. GET /detail?id=52772
router.get('/detail', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id query param' });

  const cacheKey = `recipes-detail-${id}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const data = await fetchWithTimeout(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`);
    if (!data.meals || data.meals.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    const meal = data.meals[0];

    // Clean up ingredients and measures
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      const meas = meal[`strMeasure${i}`];
      if (ing && ing.trim()) {
        ingredients.push({
          ingredient: ing.trim(),
          measure: meas ? meas.trim() : ''
        });
      }
    }

    const recipe = {
      idMeal: meal.idMeal,
      strMeal: meal.strMeal,
      strCategory: meal.strCategory,
      strArea: meal.strArea,
      strInstructions: meal.strInstructions,
      strMealThumb: meal.strMealThumb,
      strYoutube: meal.strYoutube,
      ingredients
    };

    setCache(cacheKey, recipe, 12 * H);
    res.json(recipe);
  } catch (e) {
    console.error('[recipes]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
