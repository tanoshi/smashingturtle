require "themoviedb"
require "pathname"
require "open-uri"

def mkSlug(title, year)
  result = title.downcase
  result = result.gsub(/ /, "-")
  result = result.gsub(/:/, "-")
  result = result.gsub(/,/, "-")
  result = result.gsub(/'/, "-")
  result = result.gsub(/\./, "-")
  result = result.gsub(/"/, "-")
  result = result.gsub(/!/, "-")
  result = result.gsub(/\?/, "-")
  result = result.gsub(/&/, "-")
  result = result.gsub(/\(/, "")
  result = result.gsub(/\)/, "")


  result = result.gsub(/--/, "-")
  result = result + "-" + year.split("-")[0]
  return result
end



def saveMovie(singleMovie)
  basePath = "_movies"
  imagePath = "img/uploads/"
  baseUrl = "https://image.tmdb.org/t/p/w400"

  slug = mkSlug(singleMovie.title, singleMovie.release_date)
  filename = basePath + "/" + slug
  if Pathname(filename+".md").exist? == false
    movieFile = File.new(filename+".md",  "w+")
    movieFile.puts "---"
    movieFile.puts "title: \"" + singleMovie.title + "\""
    movieFile.puts "popularity: " + singleMovie.popularity.to_s
    movieFile.puts "year: " + singleMovie.release_date.split("-")[0]
    movieFile.puts "teaser: /" + imagePath + slug + "-teaser.jpg"
    movieFile.puts "poster: /" + imagePath + slug + "-poster.jpg"
    movieFile.puts "---"
    movieFile.puts singleMovie.overview

    File.open(imagePath + slug + "-teaser.jpg", 'wb') do |fo|
      fo.write open(baseUrl + singleMovie.backdrop_path).read
    end
    File.open(imagePath + slug + "-poster.jpg", 'wb') do |fo|
      fo.write open(baseUrl + singleMovie.poster_path).read
    end
    movieFile.close()
    puts "written -> " + mkSlug(singleMovie.title, singleMovie.release_date)
  end
end

Tmdb::Api.key("692d05dda85844d3a0a480d7270e2a1e")
Tmdb::Api.language("en")



mostPopular = Tmdb::Movie.popular

mostPopular.each do |singleMovie|
  saveMovie(singleMovie)
  similar = Tmdb::Movie.similar_movies(singleMovie.id)
  similar.each do |similarMovie|
    saveMovie(similarMovie)
  end
end
