UPDATE settings
SET payload=json_set(payload,'$.contactEmail','support.onlinesir@gmail.com'),version=version+1
WHERE id='site' AND COALESCE(json_extract(payload,'$.contactEmail'),'')='';
