const contentful = require("contentful-management");

const sendDataToContentful = (
  trackDataJSON,
  matchDuration,
  matchArr,
  roundedBeatPositions
) => {
  const client = contentful.createClient({
    accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
  });

  client.getSpace(process.env.CONTENTFUL_SPACE_ID).then((space) => {
    space
      .getEnvironment("master")
      .then((environment) =>
        environment.createEntry("song", {
          fields: {
            title: {
              "en-US": "Test title",
            },
            artist: {
              "en-US": "Test artist",
            },
          },
        })
      )
      .then((entry) => {
        console.log(entry);
        entry.publish();
      })
      .catch(console.error);
  });
};

module.exports = sendDataToContentful;
