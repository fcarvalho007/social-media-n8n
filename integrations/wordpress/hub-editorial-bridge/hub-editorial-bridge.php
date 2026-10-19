<?php
/**
 * Plugin Name: Hub Editorial Bridge
 * Description: Metadados editoriais do Hub pela REST API autenticada do WordPress.
 * Version: 1.0.0
 * Requires at least: 6.6
 * Requires PHP: 7.4
 */
if (!defined('ABSPATH')) { exit; }
function hub_editorial_meta_schema() {
    return array('type'=>'object','context'=>array('edit'),'additionalProperties'=>false,'properties'=>array(
        'titulo'=>array('type'=>'string','maxLength'=>200),'descricao'=>array('type'=>'string','maxLength'=>320),
        'palavra'=>array('type'=>'string','maxLength'=>80),'schema'=>array('type'=>'string','enum'=>array('Article','BlogPosting','nenhum'))));
}
function hub_editorial_ler($object) {
    $id = (int) $object['id'];
    if (!current_user_can('edit_post', $id)) { return null; }
    return array('titulo'=>(string)get_post_meta($id,'_hub_seo_titulo',true),'descricao'=>(string)get_post_meta($id,'_hub_seo_descricao',true),'palavra'=>(string)get_post_meta($id,'_hub_seo_palavra',true),'schema'=>(string)get_post_meta($id,'_hub_seo_schema',true));
}
function hub_editorial_guardar($v, $post) {
    if (!current_user_can('edit_post', $post->ID)) { return new WP_Error('hub_forbidden','Sem acesso ao artigo.',array('status'=>403)); }
    $valid = rest_validate_value_from_schema($v,hub_editorial_meta_schema()); if (is_wp_error($valid)) { return $valid; }
    foreach (array('titulo','descricao','palavra','schema') as $key) { if (!isset($v[$key])) { return new WP_Error('hub_incomplete','Metadados incompletos.',array('status'=>400)); } }
    foreach ($v as $key=>$valor) { update_post_meta($post->ID,'_hub_seo_'.$key,sanitize_text_field($valor)); }
    if (defined('RANK_MATH_VERSION')) {
        update_post_meta($post->ID,'rank_math_title',sanitize_text_field($v['titulo']));
        update_post_meta($post->ID,'rank_math_description',sanitize_text_field($v['descricao']));
        update_post_meta($post->ID,'rank_math_focus_keyword',sanitize_text_field($v['palavra']));
    } elseif (defined('WPSEO_VERSION')) {
        update_post_meta($post->ID,'_yoast_wpseo_title',sanitize_text_field($v['titulo']));
        update_post_meta($post->ID,'_yoast_wpseo_metadesc',sanitize_text_field($v['descricao']));
        update_post_meta($post->ID,'_yoast_wpseo_focuskw',sanitize_text_field($v['palavra']));
    }
    $verificar=array();
    if(defined('RANK_MATH_VERSION'))$verificar=array('rank_math_title'=>'titulo','rank_math_description'=>'descricao','rank_math_focus_keyword'=>'palavra');
    elseif(defined('WPSEO_VERSION'))$verificar=array('_yoast_wpseo_title'=>'titulo','_yoast_wpseo_metadesc'=>'descricao','_yoast_wpseo_focuskw'=>'palavra');
    foreach($verificar as $meta=>$key){if((string)get_post_meta($post->ID,$meta,true)!==sanitize_text_field($v[$key]))return new WP_Error('hub_unconfirmed','Não foi confirmada a gravação dos metadados SEO.',array('status'=>409));}
    return true;
}
add_action('rest_api_init',function(){
    register_rest_field('post','hub_editorial',array('get_callback'=>'hub_editorial_ler','update_callback'=>'hub_editorial_guardar','schema'=>hub_editorial_meta_schema()));
    register_rest_route('hub-editorial/v1','/capabilities',array('methods'=>'GET','permission_callback'=>function(){return current_user_can('edit_posts');},'callback'=>function(){return array('versao'=>1,'metadados'=>(!hub_editorial_tem_seo() || (defined('RANK_MATH_VERSION') xor defined('WPSEO_VERSION'))),'plugin_seo'=>defined('RANK_MATH_VERSION')?'rankmath':(defined('WPSEO_VERSION')?'yoast':(hub_editorial_tem_seo()?'outro':'hub')));}));
});
function hub_editorial_tem_seo() { return defined('RANK_MATH_VERSION') || defined('WPSEO_VERSION') || defined('AIOSEO_VERSION') || defined('SEOPRESS_VERSION') || defined('THE_SEO_FRAMEWORK_VERSION'); }
// Without an SEO plugin, expose only the approved values saved by an authenticated edit.
add_filter('pre_get_document_title',function($titulo){if(is_singular('post')&&!hub_editorial_tem_seo()){$v=get_post_meta(get_queried_object_id(),'_hub_seo_titulo',true);if($v!=='')return $v;}return $titulo;},20);
add_action('wp_head',function(){
    if(!is_singular('post')||hub_editorial_tem_seo())return;
    $id=get_queried_object_id();$desc=get_post_meta($id,'_hub_seo_descricao',true);
    if($desc!=='')echo '<meta name="description" content="'.esc_attr($desc).'">'."\n";
    // Existing SEO plugins own their schema. Never inject a second Article graph beside them.
    $tipo=get_post_meta($id,'_hub_seo_schema',true);if(!in_array($tipo,array('Article','BlogPosting'),true))return;
    $dados=array('@context'=>'https://schema.org','@type'=>$tipo,'headline'=>get_the_title($id),'description'=>$desc,'url'=>get_permalink($id),'datePublished'=>get_post_time('c',true,$id),'dateModified'=>get_post_modified_time('c',true,$id));
    if(has_post_thumbnail($id))$dados['image']=wp_get_attachment_image_url(get_post_thumbnail_id($id),'full');
    echo '<script type="application/ld+json">'.wp_json_encode($dados,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT).'</script>'."\n";
},20);
