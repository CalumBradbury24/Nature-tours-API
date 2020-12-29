//.sort(), .find() etc are mongoose query methods (can only be used on queries)

class APIFeatures {
  constructor(query, queryString) {
    //mongoose query and query String from express (req.query)
    this.query = query; //query variable (query from Tour.find() for example that returns all documents in the collection)
    this.queryString = queryString; //req.query (everything in url after '?')
  }

  filter() {
    //1a)Filtering - removing query parameters that aren't required
    // const queryObject = req.query; //This is a reference of req.query object (like in C++ when actual address of value is sent to a function so the variable is directly changed in memory)
    const queryObj = { ...this.queryString }; //Create new object from req.query (spread operator takes all fields out of the req.query object and puts them into the new queryObj object)
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((element) => delete queryObj[element]); //Delete req.query elements that we dont want for this route such as page, limit so that we can filter using the req.query elements we want etc

    //1a) Advanced filtering to use gte,lt etc
    let queryStr = JSON.stringify(queryObj); //Turn javaScript object into JSON string
    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt)\b/g,
      (matchedString) => `$${matchedString}`
    ); //only match exact words, put a dollar sign infront of every matched word to turn the json string into a mondodB query for the find() function

    this.query = this.query.find(JSON.parse(queryStr)); //Filters the tours/users etc and returns results that match the query parameters that havent been filtered out of req.query

    return this; //return entire object so more functions can be chained after this function call
  }

  sort() {
    //2) Sorting - If there is a sort property in req.query
    if (this.queryString.sort) {
      //with multiple sort fields req.query.sort would be a string like -> price,ratingAverage,difficulty etc
      const sortBy = this.queryString.sort.replace(/,/g, " "); //sort function needs string to be like (price ratingAverage) - this will sort by price, then by ratingAverage etc
      // console.log(sortBy);
      this.query = this.query.sort(sortBy); //Sort all results in ascending order. req.query.sort is the value of the field (for example if sort=price in req.query then req.query.sort = price)
    } else {
      this.query = this.query.sort("-createdAt"); //sort by latest entry to oldest entry
    }
    return this; //return entire object so more functions can be chained after this function call
  }

  limitFields() {
    //3) Field limiting
    if (this.queryString.fields) {
      const fields = this.queryString.fields.replace(/,/g, " "); //replace commas in fields string with spaces
      this.query = this.query.select(fields); //Return result only containing these field names (mongoose wants fields in form of 'name price duration' etc)
    } else {
      //If no specific fields are specified send all fields except the -__v field
      this.query = this.query.select("-__v"); //Return all fields except the -__v field from the collection
    }
    return this; //return entire object so more functions can be chained after this function call
  }

  paginate() {
    //4) Pagination - to make sure we don't send every document in the potentially huge database to the client (page and limit are specified in the query part of the request (everything after '?' in url ))
    const page = this.queryString.page * 1 || 1; //Convert string to number. by default set page to 1 if page is not specified in url
    const limit = this.queryString.limit * 1 || 100; //Get page limit, by default set max number of documents sent to client as 100 if limit is not specified in url
    const skip = (page - 1) * limit;

    //could look like -> page=2&limit=10 //10 results on page 1 are skipped, return from page 2 with 10 results on each page
    this.query = this.query.skip(skip).limit(limit);

    return this; //return entire object so more functions can be chained after this function call
  }
}

module.exports = APIFeatures;
