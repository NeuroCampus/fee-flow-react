from rest_framework import serializers
from .models import User
from .models import StudentProfile, Notification, FeeComponent, FeeTemplate, FeeTemplateComponent, FeeAssignment

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'role', 'is_staff', 'is_superuser')

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = ('id', 'name', 'usn', 'dept', 'semester', 'status', 'user')
        read_only_fields = ('user', 'usn', 'dept', 'semester', 'status')

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'user', 'message', 'is_read', 'created_at')

class FeeComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeComponent
        fields = ('id', 'name', 'amount')

class FeeTemplateComponentSerializer(serializers.ModelSerializer):
    component = FeeComponentSerializer(read_only=True)
    component_id = serializers.PrimaryKeyRelatedField(queryset=FeeComponent.objects.all(), source='component', write_only=True)

    class Meta:
        model = FeeTemplateComponent
        fields = ('id', 'component', 'component_id', 'amount_override')

class FeeTemplateSerializer(serializers.ModelSerializer):
    components = FeeTemplateComponentSerializer(source='feetemplatecomponent_set', many=True, read_only=True)
    component_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = FeeTemplate
        fields = ('id', 'name', 'dept', 'semester', 'components', 'component_ids')

    def create(self, validated_data):
        component_ids = validated_data.pop('component_ids', [])
        template = FeeTemplate.objects.create(**validated_data)
        for comp_id in component_ids:
            component = FeeComponent.objects.get(id=comp_id)
            FeeTemplateComponent.objects.create(template=template, component=component)
        return template

    def update(self, instance, validated_data):
        component_ids = validated_data.pop('component_ids', None)

        instance.name = validated_data.get('name', instance.name)
        instance.dept = validated_data.get('dept', instance.dept)
        instance.semester = validated_data.get('semester', instance.semester)
        instance.save()

        if component_ids is not None:
            instance.feetemplatecomponent_set.all().delete()
            for comp_id in component_ids:
                component = FeeComponent.objects.get(id=comp_id)
                FeeTemplateComponent.objects.create(template=instance, component=component)

        return instance


class FeeAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeAssignment
        fields = ('id', 'student', 'template', 'overrides')
