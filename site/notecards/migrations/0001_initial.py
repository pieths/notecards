# Generated by Django 2.1.5 on 2019-03-19 18:58

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import notecards.models.card
import notecards.models.file_attachment


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Card',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('uuid', models.CharField(default=notecards.models.card.get_new_uuid, max_length=22)),
                ('title', models.CharField(default='', max_length=128)),
                ('query', models.TextField(default='')),
                ('answer', models.TextField(default='')),
                ('creation_date', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date created')),
                ('last_modified_date', models.DateTimeField()),
                ('next_retrieval_date', models.DateTimeField()),
                ('spacing_bin', models.IntegerField(default=1)),
                ('active', models.BooleanField(default=True)),
                ('sha_512', models.CharField(max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name='FileAttachment',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to=notecards.models.file_attachment.get_file_path)),
                ('sha_512', models.CharField(max_length=100)),
                ('media_type', models.CharField(default='application/octet-stream', max_length=128)),
                ('creation_date', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date created')),
                ('card', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='notecards.Card')),
            ],
        ),
        migrations.CreateModel(
            name='RetrievalAttempt',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('retrieval_date', models.DateTimeField(default=django.utils.timezone.now)),
                ('retrieved', models.BooleanField(default=False)),
                ('spacing_bin', models.IntegerField(default=1)),
                ('card', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='notecards.Card')),
            ],
        ),
        migrations.CreateModel(
            name='Tag',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.CharField(default='', max_length=100)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='card',
            name='tags',
            field=models.ManyToManyField(to='notecards.Tag'),
        ),
        migrations.AddField(
            model_name='card',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterUniqueTogether(
            name='tag',
            unique_together={('user', 'label')},
        ),
        migrations.AlterUniqueTogether(
            name='card',
            unique_together={('user', 'uuid')},
        ),
    ]
