-- Launch catalog. Only rewrite factory defaults. Settled payments stay untouched.

UPDATE celecard_lifecycle_policy
SET conciergePriceGhs = 800
WHERE id = 'default' AND conciergePriceGhs = 199;

UPDATE celecard_lifecycle_policy
SET planPrices = json_set(planPrices, '$.yearly', 399)
WHERE id = 'default'
  AND planPrices IS NOT NULL
  AND json_extract(planPrices, '$.yearly') = 449
  AND json_extract(planPrices, '$.monthly') = 49
  AND json_extract(planPrices, '$.quarter') = 129
  AND json_extract(planPrices, '$.half') = 239;

UPDATE celecard_lifecycle_policy
SET reminderOffsetsDays = '[14,7,1,0,-3,-14]'
WHERE id = 'default'
  AND (
    CAST(reminderOffsetsDays AS TEXT) = '[14,7,3,1,0,-3,-14,-30]'
    OR CAST(reminderOffsetsDays AS TEXT) = '[14, 7, 3, 1, 0, -3, -14, -30]'
  );
