(() => {
  const params=new URLSearchParams(location.search);
  if(['category','device','style','search','q'].some(key=>params.has(key))||['#latest-wallpapers','#screen-fit'].includes(location.hash)){
    location.replace('/browse/'+location.search+location.hash);
  }
})();
