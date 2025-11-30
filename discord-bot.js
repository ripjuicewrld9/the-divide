import { Client, GatewayIntentBits, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const SUPPORT_CHANNEL_ID = process.env.DISCORD_SUPPORT_CHANNEL_ID;
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;
const JWT_SECRET = process.env.JWT_SECRET;

// Slash command definition
const commands = [
  {
    name: 'setup-tickets',
    description: 'Create the support ticket panel (Admin only)'
  }
];

client.once('ready', async () => {
  console.log(`✅ Discord bot logged in as ${client.user.tag}`);
  
  // Register slash commands
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ Slash commands registered');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  // Handle /setup-tickets command
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup-tickets') {
    // Check if user is admin
    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: '❌ Only admins can use this command', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🎫 Support Ticket System')
      .setDescription('Need help? Click the button below to create a support ticket.\n\nOur team will respond as soon as possible in a private thread.')
      .setColor(0x3b82f6)
      .addFields(
        { name: '📋 Categories', value: '• General\n• Bug Report\n• Payment Issue\n• Complaint', inline: true },
        { name: '⏱️ Response Time', value: 'Usually within 24 hours', inline: true }
      )
      .setFooter({ text: 'BetBro Support' });

    const button = new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('Create Support Ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.reply({ embeds: [embed], components: [row] });
    await interaction.followUp({ content: '✅ Support ticket panel created!', ephemeral: true });
  }

  // Handle button click
  if (interaction.isButton() && interaction.customId === 'create_ticket') {
    const modal = new ModalBuilder()
      .setCustomId('ticket_modal')
      .setTitle('Create Support Ticket');

    const categoryInput = new TextInputBuilder()
      .setCustomId('category')
      .setLabel('Category')
      .setPlaceholder('general, bug, payment, or complaint')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const subjectInput = new TextInputBuilder()
      .setCustomId('subject')
      .setLabel('Subject')
      .setPlaceholder('Brief summary of your issue')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Description')
      .setPlaceholder('Detailed description of your issue')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const emailInput = new TextInputBuilder()
      .setCustomId('email')
      .setLabel('Email (optional)')
      .setPlaceholder('your.email@example.com')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(categoryInput),
      new ActionRowBuilder().addComponents(subjectInput),
      new ActionRowBuilder().addComponents(descriptionInput),
      new ActionRowBuilder().addComponents(emailInput)
    );

    await interaction.showModal(modal);
  }

  // Handle modal submission
  if (interaction.isModalSubmit() && interaction.customId === 'ticket_modal') {
    await interaction.deferReply({ ephemeral: true });

    const category = interaction.fields.getTextInputValue('category').toLowerCase();
    const subject = interaction.fields.getTextInputValue('subject');
    const description = interaction.fields.getTextInputValue('description');
    const email = interaction.fields.getTextInputValue('email') || 'Not provided';

    const ticketId = Date.now().toString(36).toUpperCase();
    const threadName = `🎫 ${category.toUpperCase()} - ${interaction.user.username} - ${ticketId}`;

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`New Support Ticket #${ticketId}`)
      .setColor(category === 'bug' ? 0xff0000 : 
                category === 'complaint' ? 0xff9900 :
                category === 'payment' ? 0x00ff00 : 0x3b82f6)
      .addFields(
        { name: '📋 Category', value: category.charAt(0).toUpperCase() + category.slice(1), inline: true },
        { name: '👤 User', value: `${interaction.user.username} (<@${interaction.user.id}>)`, inline: true },
        { name: '📧 Email', value: email, inline: true },
        { name: '📌 Subject', value: subject, inline: false },
        { name: '📝 Description', value: description.length > 1024 ? description.substring(0, 1021) + '...' : description, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: 'Support Ticket System' });

    try {
      // Create private thread
      const thread = await interaction.channel.threads.create({
        name: threadName,
        type: 12, // Private thread
        autoArchiveDuration: 10080, // 7 days
        invitable: false
      });

      // Add user to thread
      await thread.members.add(interaction.user.id);

      // Send initial message
      await thread.send({
        content: `${ADMIN_ROLE_ID ? `<@&${ADMIN_ROLE_ID}>` : '@here'} New support ticket from **${interaction.user.username}** (<@${interaction.user.id}>)`,
        embeds: [embed]
      });

      // Send follow-up
      await thread.send(`📨 **Ticket #${ticketId}** created for **${interaction.user.username}**\n\nAdmins can respond here. You will receive notifications for updates.`);

      await interaction.editReply({
        content: `✅ Support ticket #${ticketId} created! Check <#${thread.id}> for updates.`
      });

      console.log(`✅ Discord ticket #${ticketId} created by ${interaction.user.username} (${interaction.user.id})`);

    } catch (error) {
      console.error('Failed to create ticket:', error);
      await interaction.editReply({
        content: '❌ Failed to create ticket. Please try again or contact an admin directly.'
      });
    }
  }
});

client.login(BOT_TOKEN);
