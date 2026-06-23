export function parseMealDbRecipe(meal) {
  // Extract non-empty ingredient/measure pairs and format as strings
  const ingredients = (meal.ingredients || [])
    .map(i => {
      const measure = (i.measure || '').trim();
      const ingredient = (i.ingredient || '').trim();
      if (measure) return `${measure} ${ingredient}`;
      return ingredient;
    })
    .filter(Boolean);

  // Parse steps by splitting on newlines
  const steps = (meal.strInstructions || '')
    .split(/\r?\n/)
    .map(step => step.trim())
    .filter(step => step.length > 0)
    .map((step, i) => ({ n: i + 1, text: step }));

  return {
    id: 'r_' + Date.now(),
    title: meal.strMeal,
    category: meal.strCategory || 'Other',
    cuisine: meal.strArea || 'Unknown',
    servings: null,
    ingredients, // string[]
    steps, // { n, text }[]
    sourceType: 'themealdb',
    sourceId: meal.idMeal,
    thumbnail: meal.strMealThumb,
    youtubeUrl: meal.strYoutube,
    importedAt: new Date().toISOString(),
  };
}

