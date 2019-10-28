const { task } = require('../services/mailer');
const nodemailer = require('nodemailer');
const { createLogger } = require('../services/logging');
const logger = createLogger('jobs:mailer');
const Context = require('../graph/context');
const { get } = require('lodash');
const aws = require('aws-sdk');

const {
  SMTP_HOST,
  SMTP_USERNAME,
  SMTP_PORT,
  SMTP_PASSWORD,
  SMTP_FROM_ADDRESS,
  AWS_SES_REGION,
  AWS_SES_ACCESS_KEY_ID,
  AWS_SES_SECRET_ACCESS_KEY_ID,
} = require('../config');
const { ErrMissingEmail } = require('../errors');

// parseSMTPPort will return the port for SMTP.
const parseSMTPPort = () => {
  if (!SMTP_PORT) {
    return 25;
  }

  try {
    return parseInt(SMTP_PORT);
  } catch (e) {
    throw new Error('TALK_SMTP_PORT is not an integer');
  }
};

// createTransport will create a new transport.
const createTransport = () => {
  const options = {
    host: SMTP_HOST,
  };

  if (SMTP_USERNAME && SMTP_PASSWORD) {
    options.auth = {
      user: SMTP_USERNAME,
      pass: SMTP_PASSWORD,
    };
  }

  // Get the SMTP port.
  options.port = parseSMTPPort();

  return nodemailer.createTransport(options);
};

// createSESTransport with create a new SES transport
const createSESTransport = () => {
  aws.config.region = AWS_SES_REGION;
  aws.config.accessKeyId = AWS_SES_ACCESS_KEY_ID;
  aws.config.secretAccessKey = AWS_SES_SECRET_ACCESS_KEY_ID;

  return nodemailer.createTransport({
    SES: new aws.SES({
      apiVersion: '2010-12-01',
    }),
  });
};

// sharedTransport is the transport singleton.
let sharedTransport;

// getTransport will retrieve the mailer transport singleton.
const getTransport = () => {
  if (sharedTransport) {
    return sharedTransport;
  }

  if (AWS_SES_ACCESS_KEY_ID && AWS_SES_SECRET_ACCESS_KEY_ID) {
    sharedTransport = createSESTransport();
    return sharedTransport;
  }

  // enabled is true when the required configuration is available. When testing
  // is enabled, we will be simulating that emails are being sent, because in a
  // production system, emails should and would be sent.

  // If the transport details aren't available, we will return null as the
  // transport.
  if (!SMTP_HOST || !SMTP_FROM_ADDRESS) {
    return null;
  }

  // Create the transport.
  sharedTransport = createTransport();

  return sharedTransport;
};

// getEmailAddress will retrieve the email address to send the message to from
// the job data.
const getEmailAddress = async ({ email, user }) => {
  // If the message has a specific email already to sent it to, just assign
  // that to the message. If the email does not have an email, and instead has
  // a user id, then we should lookup the user with the graph and get their
  // email.
  if (email) {
    return email;
  } else {
    // Get the user to send the message to.
    const ctx = Context.forSystem();

    const { data, errors } = await ctx.graphql(
      `
        query GetUserEmail($user: ID!) {
          user(id: $user) {
            email
          }
        }
      `,
      { user }
    );
    if (errors) {
      throw errors;
    }

    const email = get(data, 'user.email');
    if (!email) {
      throw new ErrMissingEmail();
    }

    return email;
  }
};

// processJob will handle new jobs sent via this queue.
const processJob = transport => async ({ id, data }, done) => {
  const { message } = data;

  // Get the email address from the job data.
  try {
    message.to = await getEmailAddress(data);
  } catch (err) {
    logger.error({ err }, 'Failed to get user email address to send mail');
    return done(err);
  }

  const log = logger.child({ jobID: id });
  log.info('Starting to send mail');

  // Actually send the email.
  transport.sendMail(message, err => {
    if (err) {
      logger.error({ err }, 'Failed to send mail');
      return done(err);
    }

    logger.info('Finished sending mail');
    return done();
  });
};

/**
 * Start the queue processor for the mailer job.
 */
module.exports = () => {
  // Get a transport.
  const transport = getTransport();
  if (transport === null) {
    logger.warn(
      'Sending email is not enabled because required configuration is not available'
    );
    return;
  }

  logger.info({ taskName: task.name }, 'Now processing jobs');

  return task.process(processJob(transport));
};
